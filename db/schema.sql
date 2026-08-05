-- REMOTE OS — PostgreSQL Schema
-- Tables: teams, users, standups

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Teams
CREATE TABLE IF NOT EXISTS teams (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(255) NOT NULL UNIQUE,
    settings    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email       VARCHAR(255) NOT NULL UNIQUE,
    name        VARCHAR(255) NOT NULL,
    avatar_url  TEXT,
    team_id     UUID REFERENCES teams(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Standups
CREATE TABLE IF NOT EXISTS standups (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    video_url   TEXT NOT NULL,
    transcript  TEXT,
    summary     TEXT,
    status      VARCHAR(50) DEFAULT 'pending',
    duration    INTEGER, -- seconds
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_team_id ON users(team_id);
CREATE INDEX IF NOT EXISTS idx_standups_user_id ON standups(user_id);
CREATE INDEX IF NOT EXISTS idx_standups_created_at ON standups(created_at);
CREATE INDEX IF NOT EXISTS idx_standups_status ON standups(status);

-- Status check enum constraint helper
ALTER TABLE standups
    DROP CONSTRAINT IF EXISTS chk_standups_status;
ALTER TABLE standups
    ADD CONSTRAINT chk_standups_status
    CHECK (status IN ('pending', 'processing', 'completed', 'failed'));
