import { db } from '@/lib/db';

export type SecurityEventType =
  | 'login_success'
  | 'login_failure'
  | 'logout'
  | 'signup_success'
  | 'signup_failure'
  | 'rate_limit_hit'
  | 'auth_failure'
  | 'api_access'
  | 'suspicious_activity'
  | 'permission_denied';

export type SecuritySeverity = 'info' | 'warning' | 'critical';

export interface SecurityLogInput {
  eventType: SecurityEventType;
  severity?: SecuritySeverity;
  userId?: string | null;
  email?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  endpoint?: string | null;
  method?: string | null;
  statusCode?: number | null;
  details?: Record<string, unknown>;
}

export async function logSecurityEvent(input: SecurityLogInput): Promise<void> {
  try {
    const ip = input.ip && input.ip.length <= 45 ? input.ip : null;
    await db.pool.query(
      `INSERT INTO security_logs
        (event_type, severity, user_id, email, ip_address, user_agent, endpoint, method, status_code, details, created_at)
       VALUES ($1, $2, $3, $4, $5::inet, $6, $7, $8, $9, $10, NOW())`,
      [
        input.eventType,
        input.severity ?? 'info',
        input.userId ?? null,
        input.email ?? null,
        ip,
        input.userAgent ?? null,
        input.endpoint ?? null,
        input.method ?? null,
        input.statusCode ?? null,
        input.details ? JSON.stringify(input.details) : '{}',
      ]
    );
  } catch (err) {
    console.error('[SECURITY] Failed to write security log:', err);
  }
}

export async function logApiAccess(opts: {
  request: { headers: Headers; url: string; method: string };
  userId?: string | null;
  email?: string | null;
  statusCode: number;
  details?: Record<string, unknown>;
}): Promise<void> {
  const forwarded = opts.request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() ?? '127.0.0.1';
  const userAgent = opts.request.headers.get('user-agent') ?? null;
  const url = new URL(opts.request.url);

  await logSecurityEvent({
    eventType: 'api_access',
    severity: opts.statusCode >= 400 ? 'warning' : 'info',
    userId: opts.userId ?? null,
    email: opts.email ?? null,
    ip,
    userAgent,
    endpoint: url.pathname,
    method: opts.request.method,
    statusCode: opts.statusCode,
    details: opts.details,
  });
}

export async function getRecentSecurityLogs(
  opts: { limit?: number; eventType?: SecurityEventType; hours?: number } = {}
): Promise<unknown[]> {
  const limit = Math.min(opts.limit ?? 100, 500);
  const conditions: string[] = [];
  const values: (string | number)[] = [];
  let idx = 1;

  if (opts.eventType) {
    conditions.push(`event_type = $${idx++}`);
    values.push(opts.eventType);
  }
  if (opts.hours) {
    conditions.push(`created_at >= NOW() - INTERVAL '${opts.hours} hours'`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const query = `SELECT * FROM security_logs ${where} ORDER BY created_at DESC LIMIT $${idx}`;
  values.push(limit);

  const result = await db.pool.query(query, values);
  return result.rows;
}

export async function getSecuritySummary(hours: number = 24): Promise<{
  failedLogins: number;
  rateLimitHits: number;
  authFailures: number;
  suspiciousEvents: number;
  totalRequests: number;
  uniqueIps: number;
  topThreats: { ip: string; count: number }[];
}> {
  const client = await db.pool.connect();
  try {
    const since = `NOW() - INTERVAL '${hours} hours'`;

    const [failedLogins, rateLimitHits, authFailures, suspiciousEvents, totalRequests, uniqueIps] =
      await Promise.all([
        client.query(`SELECT COUNT(*) FROM security_logs WHERE event_type = 'login_failure' AND created_at >= ${since}`),
        client.query(`SELECT COUNT(*) FROM security_logs WHERE event_type = 'rate_limit_hit' AND created_at >= ${since}`),
        client.query(`SELECT COUNT(*) FROM security_logs WHERE event_type = 'auth_failure' AND created_at >= ${since}`),
        client.query(`SELECT COUNT(*) FROM security_logs WHERE severity = 'warning' AND created_at >= ${since}`),
        client.query(`SELECT COUNT(*) FROM security_logs WHERE created_at >= ${since}`),
        client.query(`SELECT COUNT(DISTINCT ip_address) FROM security_logs WHERE created_at >= ${since}`),
      ]);

    const topThreatsRes = await client.query(
      `SELECT ip_address, COUNT(*) as cnt
       FROM security_logs
       WHERE severity IN ('warning','critical') AND created_at >= ${since}
       GROUP BY ip_address
       ORDER BY cnt DESC
       LIMIT 5`
    );

    return {
      failedLogins: parseInt(failedLogins.rows[0].count, 10),
      rateLimitHits: parseInt(rateLimitHits.rows[0].count, 10),
      authFailures: parseInt(authFailures.rows[0].count, 10),
      suspiciousEvents: parseInt(suspiciousEvents.rows[0].count, 10),
      totalRequests: parseInt(totalRequests.rows[0].count, 10),
      uniqueIps: parseInt(uniqueIps.rows[0].count, 10),
      topThreats: topThreatsRes.rows.map((r) => ({ ip: r.ip_address, count: parseInt(r.cnt, 10) })),
    };
  } finally {
    client.release();
  }
}
