import { db } from '@/lib/db';

export type AuditAction = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';

export interface AuditInput {
  tableName: string;
  recordId: string;
  action: AuditAction;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  userId?: string | null;
  userEmail?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

export async function auditLog(input: AuditInput): Promise<void> {
  try {
    const ip = input.ip && input.ip.length <= 45 ? input.ip : null;
    await db.pool.query(
      `INSERT INTO audit_logs
        (table_name, record_id, action, old_values, new_values, user_id, user_email, ip_address, user_agent, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::inet, $9, NOW())`,
      [
        input.tableName,
        input.recordId,
        input.action,
        input.oldValues ? JSON.stringify(input.oldValues) : null,
        input.newValues ? JSON.stringify(input.newValues) : null,
        input.userId ?? null,
        input.userEmail ?? null,
        ip,
        input.userAgent ?? null,
      ]
    );
  } catch (err) {
    console.error('[AUDIT] Failed to write audit log:', err);
  }
}

export async function getAuditLogs(opts: {
  tableName?: string;
  recordId?: string;
  userId?: string;
  limit?: number;
  hours?: number;
} = {}): Promise<unknown[]> {
  const limit = Math.min(opts.limit ?? 100, 500);
  const conditions: string[] = [];
  const values: (string | number)[] = [];
  let idx = 1;

  if (opts.tableName) {
    conditions.push(`table_name = $${idx++}`);
    values.push(opts.tableName);
  }
  if (opts.recordId) {
    conditions.push(`record_id = $${idx++}`);
    values.push(opts.recordId);
  }
  if (opts.userId) {
    conditions.push(`user_id = $${idx++}`);
    values.push(opts.userId);
  }
  if (opts.hours) {
    conditions.push(`created_at >= NOW() - INTERVAL '${opts.hours} hours'`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const query = `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT $${idx}`;
  values.push(limit);

  const result = await db.pool.query(query, values);
  return result.rows;
}
