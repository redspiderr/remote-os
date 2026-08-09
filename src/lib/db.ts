import { Pool } from "pg";

export const db = {
  pool: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
};

// ─── Table names for AI Coach ────────────────────────────────────────
export const GOALS_TABLE = 'goals';
export const MOOD_LOGS_TABLE = 'mood_logs';
export const AI_INSIGHTS_TABLE = 'ai_insights';

// ─── Collaboration Schema (see db/schema.sql for full DDL) ─────────
// teams, team_members, comments, reactions
