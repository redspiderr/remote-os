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

// ─── Calendar Schema ────────────────────────────────────────────────
export const CALENDAR_INTEGRATIONS_TABLE = 'calendar_integrations';
export const CALENDAR_EVENTS_TABLE = 'calendar_events';

// ─── Manager Notes Schema ───────────────────────────────────────────
export const MANAGER_NOTES_TABLE = 'manager_notes';

// ─── Integrations Schema ─────────────────────────────────────────────
export const CONNECTED_APPS_TABLE = 'connected_apps';
export const INTEGRATION_WEBHOOKS_TABLE = 'integration_webhooks';
