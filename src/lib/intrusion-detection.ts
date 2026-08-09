import { logSecurityEvent } from '@/lib/security-logger';
import { rateLimit } from '@/lib/rate-limit';

// ─── In-Memory Detection Store ( production: use Redis )
// Tracks per-IP and per-email attempt windows.

interface AttemptWindow {
  count: number;
  firstAt: number;
  resetAt: number;
}

interface BurstWindow {
  count: number;
  resetAt: number;
}

const failedLogins: Record<string, AttemptWindow> = {};
const apiBursts: Record<string, BurstWindow> = {};
const offHoursIps: Record<string, { count: number; lastAt: number }> = {};
const flaggedEmails: Record<string, { reason: string; flaggedAt: number }> = {};

const FAILED_LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const FAILED_LOGIN_THRESHOLD = 5;
const API_BURST_WINDOW_MS = 60 * 1000; // 1 minute
const API_BURST_THRESHOLD = 120;
const OFF_HOURS_START = 23;
const OFF_HOURS_END = 5;

function nowMs() {
  return Date.now();
}

function getWindow(store: Record<string, AttemptWindow>, key: string, windowMs: number): AttemptWindow {
  const n = nowMs();
  if (!store[key] || store[key].resetAt < n) {
    store[key] = { count: 0, firstAt: n, resetAt: n + windowMs };
  }
  return store[key];
}

function getBurstWindow(store: Record<string, BurstWindow>, key: string, windowMs: number): BurstWindow {
  const n = nowMs();
  if (!store[key] || store[key].resetAt < n) {
    store[key] = { count: 0, resetAt: n + windowMs };
  }
  return store[key];
}

export function recordFailedLogin(opts: { ip: string; email?: string | null }): {
  blocked: boolean;
  remaining: number;
} {
  const ipWindow = getWindow(failedLogins, opts.ip, FAILED_LOGIN_WINDOW_MS);
  ipWindow.count++;

  if (opts.email) {
    const emailWindow = getWindow(failedLogins, `email:${opts.email}`, FAILED_LOGIN_WINDOW_MS);
    emailWindow.count++;
  }

  const blocked = ipWindow.count >= FAILED_LOGIN_THRESHOLD;
  const remaining = Math.max(0, FAILED_LOGIN_THRESHOLD - ipWindow.count);

  if (blocked) {
    logSecurityEvent({
      eventType: 'suspicious_activity',
      severity: 'critical',
      email: opts.email ?? null,
      ip: opts.ip,
      details: {
        reason: 'multiple_failed_logins',
        attempts: ipWindow.count,
        windowMinutes: FAILED_LOGIN_WINDOW_MS / 60000,
      },
    });
  }

  return { blocked, remaining };
}

export function recordApiBurst(opts: { ip: string; endpoint: string; method: string }): {
  throttled: boolean;
} {
  const key = `${opts.ip}:${opts.method}:${opts.endpoint}`;
  const burst = getBurstWindow(apiBursts, key, API_BURST_WINDOW_MS);
  burst.count++;

  const throttled = burst.count >= API_BURST_THRESHOLD;
  if (throttled) {
    logSecurityEvent({
      eventType: 'suspicious_activity',
      severity: 'warning',
      ip: opts.ip,
      endpoint: opts.endpoint,
      method: opts.method,
      details: {
        reason: 'api_burst',
        requests: burst.count,
        windowSeconds: API_BURST_WINDOW_MS / 1000,
      },
    });
  }

  return { throttled };
}

export function isOffHours(): boolean {
  const hour = new Date().getUTCHours();
  return hour >= OFF_HOURS_START || hour <= OFF_HOURS_END;
}

export function recordOffHoursAccess(opts: { ip: string; userId?: string | null; email?: string | null; endpoint?: string }): void {
  if (!isOffHours()) return;

  const entry = offHoursIps[opts.ip] ?? { count: 0, lastAt: 0 };
  entry.count++;
  entry.lastAt = nowMs();
  offHoursIps[opts.ip] = entry;

  if (entry.count >= 3) {
    logSecurityEvent({
      eventType: 'suspicious_activity',
      severity: 'warning',
      userId: opts.userId ?? null,
      email: opts.email ?? null,
      ip: opts.ip,
      endpoint: opts.endpoint ?? null,
      details: {
        reason: 'off_hours_access',
        occurrences: entry.count,
      },
    });
  }
}

export function flagUser(email: string, reason: string): void {
  flaggedEmails[email] = { reason, flaggedAt: nowMs() };
  logSecurityEvent({
    eventType: 'suspicious_activity',
    severity: 'critical',
    email,
    details: { reason, action: 'user_flagged' },
  });
}

export function isFlagged(email: string): { flagged: boolean; reason?: string } {
  const f = flaggedEmails[email];
  if (!f) return { flagged: false };
  // Auto-expire after 24h
  if (nowMs() - f.flaggedAt > 24 * 60 * 60 * 1000) {
    delete flaggedEmails[email];
    return { flagged: false };
  }
  return { flagged: true, reason: f.reason };
}

// Auto-throttle for suspicious IPs
export function shouldThrottle(ip: string): boolean {
  const ipWindow = failedLogins[ip];
  if (ipWindow && ipWindow.count >= FAILED_LOGIN_THRESHOLD && ipWindow.resetAt > nowMs()) {
    return true;
  }
  const burst = apiBursts[ip];
  if (burst && burst.count >= API_BURST_THRESHOLD && burst.resetAt > nowMs()) {
    return true;
  }
  return false;
}

export function getIntrusionSnapshot(): {
  failedLoginIps: string[];
  burstIps: string[];
  offHoursIps: string[];
  flaggedEmails: string[];
} {
  const n = nowMs();
  return {
    failedLoginIps: Object.keys(failedLogins).filter((k) => !k.startsWith('email:') && failedLogins[k].resetAt > n),
    burstIps: Object.keys(apiBursts).filter((k) => apiBursts[k].resetAt > n),
    offHoursIps: Object.keys(offHoursIps),
    flaggedEmails: Object.keys(flaggedEmails).filter((e) => {
      const f = flaggedEmails[e];
      return f && nowMs() - f.flaggedAt <= 24 * 60 * 60 * 1000;
    }),
  };
}

// Cleanup every 10 minutes
setInterval(() => {
  const n = nowMs();
  Object.keys(failedLogins).forEach((k) => {
    if (failedLogins[k].resetAt < n) delete failedLogins[k];
  });
  Object.keys(apiBursts).forEach((k) => {
    if (apiBursts[k].resetAt < n) delete apiBursts[k];
  });
  Object.keys(offHoursIps).forEach((k) => {
    if (n - offHoursIps[k].lastAt > 60 * 60 * 1000) delete offHoursIps[k];
  });
}, 10 * 60 * 1000);
