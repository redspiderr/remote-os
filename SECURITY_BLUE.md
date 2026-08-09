# 🔒 REMOTE OS — Blue Team Security Defense Layers

## Overview
This document describes the defensive security architecture added to REMOTE OS v0.5.2 by the Blue Team. Every layer is designed to **detect, deter, and document** threats while maintaining system availability.

---

## 1. Security Logging (`src/lib/security-logger.ts`)

All security-relevant events are written to the PostgreSQL `security_logs` table.

### Logged Events
- **Auth**: login success, login failure, logout, signup success/failure
- **API Access**: IP, user, endpoint, HTTP method, status code, timestamp
- **Failures**: rate-limit hits, permission denied, auth failures
- **Anomalies**: suspicious activity flags

### Table Schema
```sql
CREATE TABLE security_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type  VARCHAR(50) NOT NULL,
    severity    VARCHAR(20) DEFAULT 'info',
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    email       VARCHAR(255),
    ip_address  INET,
    user_agent  TEXT,
    endpoint    TEXT,
    method      VARCHAR(10),
    status_code INTEGER,
    details     JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### Integration Points
- `src/lib/auth.ts` — logs every login attempt (success/failure) with IP + user-agent
- `src/middleware.ts` — logs rate-limit hits, auth failures, and every authenticated API call

---

## 2. Audit Trail (`src/lib/audit.ts`)

Immutable append-only audit logs for every CRUD operation on `standups`.

### Logged Actions
- **CREATE**: new standup recorded
- **READ**: standup list fetched
- **UPDATE**: transcript/summary/status/duration changed
- **DELETE**: standup removed

### Captured Fields
- `table_name`, `record_id`, `action`
- `old_values` + `new_values` (JSONB)
- `user_id`, `user_email`, `ip_address`, `user_agent`
- `created_at`

### Table Schema
```sql
CREATE TABLE audit_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name  VARCHAR(100) NOT NULL,
    record_id   UUID NOT NULL,
    action      VARCHAR(20) NOT NULL,
    old_values  JSONB,
    new_values  JSONB,
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email  VARCHAR(255),
    ip_address  INET,
    user_agent  TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### Integration Points
- `src/app/api/standups/route.ts` — every GET/POST/PATCH/DELETE writes an audit row

---

## 3. Intrusion Detection (`src/lib/intrusion-detection.ts`)

Real-time in-memory heuristics to spot suspicious behavior.

### Detection Rules
| Threat | Threshold | Window | Auto-Response |
|--------|-----------|--------|---------------|
| Multiple failed logins | ≥ 5 attempts | 15 min | Log critical event; IP throttled |
| API burst | ≥ 120 requests | 1 min | Log warning; IP throttled |
| Off-hours access | ≥ 3 accesses | — | Log warning |
| Flagged user | Manual or auto | 24h | Log critical; block if needed |

### Auto-Throttling
- `shouldThrottle(ip)` checks whether an IP is currently in a penalty window
- Enforced in `src/middleware.ts` before any request is processed
- Returns `403` with `suspicious_activity` log entry

### Off-Hours Detection
- Tracks UTC hours 23:00–05:00
- Counts per IP; after 3 off-hours hits, raises a warning log

---

## 4. Security Dashboard (`/admin` → Security Tab)

The admin console now has a **Security** tab powered by `AdminAnalytics.tsx`.

### Metrics Shown
- **Security Score**: 0–100 score penalized by total threat volume
- **Failed Logins / Rate-Limit Hits / Auth Failures / Suspicious Events**
- **Top Threat IPs**: list of worst offenders in last 24h
- **Active Alerts**: live intrusion snapshot (failed-login IPs, burst IPs, off-hours IPs, flagged emails)

### Data Source
- `api/admin/stats` returns `security` (24h summary from DB) + `intrusion` (live memory snapshot)

---

## 5. Security Headers & Hardening (`next.config.ts`)

All routes receive hardened HTTP headers:

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Frame-Options` | `DENY` | Clickjacking protection |
| `X-Content-Type-Options` | `nosniff` | MIME-sniffing protection |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Leak prevention |
| `Permissions-Policy` | `camera=(), microphone=(), ...` | Feature policy hardening |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | HSTS |
| `Content-Security-Policy` | `default-src 'self'; script-src ...` | XSS mitigation |
| `X-DNS-Prefetch-Control` | `on` | Performance + privacy |

Also disabled:
- `poweredByHeader: false` — removes `X-Powered-By`

---

## Quick Reference — Files Changed / Created

| File | Action | Purpose |
|------|--------|---------|
| `db/schema.sql` | Modified | Added `security_logs` + `audit_logs` tables |
| `src/lib/security-logger.ts` | **Created** | Central security logging utility |
| `src/lib/audit.ts` | **Created** | Audit trail utility |
| `src/lib/intrusion-detection.ts` | **Created** | Real-time threat detection |
| `src/middleware.ts` | Modified | Rate-limit + auth + off-hours + API logging |
| `src/lib/auth.ts` | Modified | Log every login success/failure |
| `src/app/api/standups/route.ts` | Modified | Audit-log every CRUD operation |
| `src/app/api/admin/stats/route.ts` | Modified | Return security + intrusion data |
| `src/components/AdminAnalytics.tsx` | Modified | Add Security tab + dashboard |
| `next.config.ts` | Modified | Security headers + hardening |
| `SECURITY_BLUE.md` | **Created** | This document |

---

## Deployment Checklist
1. Apply schema changes: `psql $DATABASE_URL -f db/schema.sql`
2. Ensure `x-forwarded-for` is passed by your reverse proxy (Vercel / Nginx / Cloudflare)
3. Review CSP in production — tighten `script-src` and `connect-src` for your CDN/domain
4. Monitor `security_logs` table growth; set up a 30-day retention job if needed
5. For Redis-backed intrusion detection in multi-node deploys, replace in-memory stores with Redis

---

*Documented by Blue Team — MEDINA OS*
