import { db } from "@/lib/db";
import { encryptCredentials, decryptCredentials } from "./encrypt";

export interface ConnectedAppRow {
  id: string;
  user_id: string;
  app: string;
  credentials: string | null;
  settings: Record<string, unknown>;
  connected_at: string;
}

export async function getConnectedApp(
  userId: string,
  app: string
): Promise<ConnectedAppRow | null> {
  const result = await db.pool.query(
    `SELECT id, user_id, app, credentials, settings, connected_at
     FROM connected_apps WHERE user_id = $1 AND app = $2`,
    [userId, app]
  );
  return result.rows[0] ?? null;
}

export async function upsertConnectedApp(
  userId: string,
  app: string,
  plainCredentials: Record<string, unknown>,
  settings?: Record<string, unknown>
): Promise<ConnectedAppRow> {
  const encrypted = encryptCredentials(plainCredentials);
  const existing = await getConnectedApp(userId, app);
  if (existing) {
    const result = await db.pool.query(
      `UPDATE connected_apps
       SET credentials = $1, settings = COALESCE($2, settings), connected_at = NOW()
       WHERE id = $3
       RETURNING id, user_id, app, credentials, settings, connected_at`,
      [encrypted, settings ?? null, existing.id]
    );
    return result.rows[0];
  }
  const result = await db.pool.query(
    `INSERT INTO connected_apps (user_id, app, credentials, settings)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_id, app, credentials, settings, connected_at`,
    [userId, app, encrypted, settings ?? {}]
  );
  return result.rows[0];
}

export async function deleteConnectedApp(userId: string, app: string): Promise<boolean> {
  const result = await db.pool.query(
    `DELETE FROM connected_apps WHERE user_id = $1 AND app = $2`,
    [userId, app]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function listConnectedApps(userId: string): Promise<ConnectedAppRow[]> {
  const result = await db.pool.query(
    `SELECT id, user_id, app, credentials, settings, connected_at
     FROM connected_apps WHERE user_id = $1 ORDER BY connected_at DESC`,
    [userId]
  );
  return result.rows;
}

export function decryptAppCredentials(row: ConnectedAppRow): Record<string, unknown> | null {
  if (!row.credentials) return null;
  return decryptCredentials(row.credentials);
}
