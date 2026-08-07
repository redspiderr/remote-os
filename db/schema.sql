-- REMOTE OS — PostgreSQL Schema
-- Tables: teams, users, standups, accounts, sessions, verification_tokens

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Teams
CREATE TABLE IF NOT EXISTS teams (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(255) NOT NULL UNIQUE,
    settings    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Users (Auth.js compatible + app fields)
CREATE TABLE IF NOT EXISTS users (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email          VARCHAR(255) NOT NULL UNIQUE,
    name           VARCHAR(255) NOT NULL,
    avatar_url     TEXT,
    password_hash  TEXT,              -- local credentials only
    team_id        UUID REFERENCES teams(id) ON DELETE SET NULL,
    email_verified TIMESTAMPTZ,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- OAuth accounts (Auth.js)
CREATE TABLE IF NOT EXISTS accounts (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type                VARCHAR(255) NOT NULL,
    provider            VARCHAR(255) NOT NULL,
    provider_account_id VARCHAR(255) NOT NULL,
    refresh_token       TEXT,
    access_token        TEXT,
    expires_at          BIGINT,
    token_type          VARCHAR(255),
    scope               VARCHAR(255),
    id_token            TEXT,
    session_state       VARCHAR(255),
    UNIQUE (provider, provider_account_id)
);

-- Sessions (Auth.js)
CREATE TABLE IF NOT EXISTS sessions (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    expires      TIMESTAMPTZ NOT NULL
);

-- Verification tokens (Auth.js passwordless / magic link)
CREATE TABLE IF NOT EXISTS verification_tokens (
    identifier VARCHAR(255) NOT NULL,
    token      VARCHAR(255) NOT NULL UNIQUE,
    expires    TIMESTAMPTZ NOT NULL,
    UNIQUE (identifier, token)
);

-- Standups
CREATE TABLE IF NOT EXISTS standups (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    video_url        TEXT NOT NULL,
    transcript       TEXT,
    summary          TEXT,
    blockers         JSONB DEFAULT '[]',
    action_items     JSONB DEFAULT '[]',
    sentiment        VARCHAR(20) CHECK (sentiment IN ('positive', 'neutral', 'concerned')),
    key_achievements JSONB DEFAULT '[]',
    status           VARCHAR(50) DEFAULT 'pending',
    duration         INTEGER, -- seconds
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_team_id ON users(team_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_standups_user_id ON standups(user_id);
CREATE INDEX IF NOT EXISTS idx_standups_created_at ON standups(created_at);
CREATE INDEX IF NOT EXISTS idx_standups_status ON standups(status);

-- Status check enum constraint helper
ALTER TABLE standups
    DROP CONSTRAINT IF EXISTS chk_standups_status;
ALTER TABLE standups
    ADD CONSTRAINT chk_standups_status
    CHECK (status IN ('pending', 'processing', 'completed', 'failed'));
