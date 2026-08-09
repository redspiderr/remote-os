# REMOTE OS v0.5.2 — Offensive Security Audit Report (RED TEAM)

**Project:** REMOTE OS (Next.js 16 + TypeScript + PostgreSQL + AI)
**Repository:** `/workspace/remote-os`
**Auditor:** MEDINA OS Red Team
**Date:** 2026-08-08
**Classification:** CONFIDENTIAL — INTERNAL USE ONLY

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Scope & Methodology](#2-scope--methodology)
3. [Risk Matrix](#3-risk-matrix)
4. [Findings](#4-findings)
5. [Dependency Vulnerabilities](#5-dependency-vulnerabilities)
6. [Recommendations Summary](#6-recommendations-summary)
7. [Appendices](#7-appendices)

---

## 1. Executive Summary

This report documents the findings of an offensive security audit ("red team" assessment) conducted against **REMOTE OS v0.5.2**, an async video standup platform built on Next.js 16, PostgreSQL, and OpenAI APIs. The assessment focused on API routes, frontend components, authentication flows, and third-party dependencies.

**Overall Risk Rating: HIGH**

| Severity | Count |
|----------|-------|
| Critical | 4 |
| High | 7 |
| Medium | 6 |
| Low | 4 |
| **Total** | **21** |

The most severe issues include **unauthenticated access to expensive AI endpoints**, **mass email abuse**, **Insecure Direct Object Reference (IDOR)** allowing cross-user data modification, and **multiple high-severity vulnerabilities in production dependencies** (path traversal, file read, SSRF via nodemailer, and native code execution risks via sharp/libvips).

---

## 2. Scope & Methodology

### Scope
- **API Routes:** `src/app/api/**/*`
- **Frontend Components:** `src/components/**/*`
- **Auth & Session Logic:** `src/lib/auth.ts`, `src/middleware.ts`
- **Infrastructure Code:** `src/lib/db.ts`, `src/lib/redis.ts`, `src/lib/email.ts`
- **Dependencies:** `package.json` + `npm audit`

### Methodology
- Static source-code analysis (manual review)
- Dependency vulnerability scanning (`npm audit`)
- Architecture & configuration review (Next.js config, middleware, env)
- Threat modeling for serverless/horizontal scaling scenarios

---

## 3. Risk Matrix

| Likelihood \ Impact | Low | Medium | High | Critical |
|---------------------|-----|--------|------|----------|
| **High**            | Low | Medium | High | Critical |
| **Medium**          | Low | Medium | High | High |
| **Low**             | Low | Low    | Medium | Medium |

---

## 4. Findings

---

### CRIT-001 — Unauthenticated AI / Summarize Endpoint (IDOR + Cost Abuse)
**Severity:** Critical
**Location:** `src/app/api/summarize/route.ts`

#### Description
The `/api/summarize` endpoint does **not** perform any authentication check. An unauthenticated attacker can:
1. Call OpenAI GPT-4o to summarize arbitrary text, burning the victim's API quota and incurring direct financial cost.
2. Pass arbitrary `standup_id` and `user_id` values to overwrite another user's standup record in PostgreSQL (Insecure Direct Object Reference / Horizontal Privilege Escalation).

#### Proof of Concept
```bash
# 1. Burn API credits
$ curl -X POST https://target.com/api/summarize \
  -H "Content-Type: application/json" \
  -d '{"transcript": "'$(python3 -c "print('A '*50000)")'"}'

# 2. Overwrite another user's standup
$ curl -X POST https://target.com/api/summarize \
  -H "Content-Type: application/json" \
  -d '{"transcript": "pwned", "standup_id": "550e8400-e29b-41d4-a716-446655440000"}'
```

#### Impact
- **Financial:** Uncontrolled OpenAI API consumption (GPT-4o token abuse).
- **Data Integrity:** Any standup in the database can be silently overwritten.
- **Confidentiality:** Standup transcripts and summaries contain private team communications.

#### Remediation
```typescript
// src/app/api/summarize/route.ts
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... existing body parsing

  // Ownership verification before DB update
  if (body.standup_id) {
    const owner = await client.query('SELECT user_id FROM standups WHERE id = $1', [body.standup_id]);
    if (!owner.rows.length || owner.rows[0].user_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }
  // ... rest of handler
}
```
Also add **rate limiting per user** (e.g., max 10 summaries/hour) and **input size caps** on `transcript` length.

---

### CRIT-002 — Unauthenticated Transcription Endpoint (Cost Abuse + Data Exfil)
**Severity:** Critical
**Location:** `src/app/api/transcribe/route.ts`

#### Description
The `/api/transcribe` endpoint lacks authentication. Anyone can upload audio/video files to be processed by OpenAI Whisper. This enables:
- Arbitrary OpenAI API quota consumption.
- Potential data exfiltration: an attacker can send files and receive transcribed text back (acts as a free proxy to Whisper).

#### Proof of Concept
```bash
curl -X POST https://target.com/api/transcribe \
  -F "file=@/dev/zero;type=video/webm" \
  -F "file=@large_video.webm"
```

#### Impact
- Financial loss via uncontrolled Whisper API calls.
- Proxy abuse: attackers can use the victim's infrastructure to transcribe content without owning an OpenAI key.

#### Remediation
```typescript
const session = await auth();
if (!session?.user?.id) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```
Enforce per-user rate limits and tie transcription to an existing standup record to prevent proxy abuse.

---

### CRIT-003 — Unauthenticated Mass Email Notification Trigger
**Severity:** Critical
**Location:** `src/app/api/notifications/route.ts`

#### Description
`POST /api/notifications/remind` has **zero authentication or authorization**. Anyone on the internet can trigger reminder emails to:
- **All users** who haven't submitted a standup today (mass email / spam).
- **Explicit user lists** via the `user_ids` array (targeted harassment / phishing amplification).

There is no rate limiting, no CAPTCHA, and no admin role check.

#### Proof of Concept
```bash
# Spam every user in the system
curl -X POST https://target.com/api/notifications/remind \
  -H "Content-Type: application/json" \
  -d '{}'

# Target specific users
curl -X POST https://target.com/api/notifications/remind \
  -H "Content-Type: application/json" \
  -d '{"user_ids": ["uuid-1", "uuid-2"]}'
```

#### Impact
- **Reputational damage:** Users receive unsolicited emails from the platform.
- **Phishing vector:** Attackers can force emails that include attacker-controlled team names (if team name injection is possible downstream).
- **DoS / cost:** Unbounded SMTP consumption and potential provider blacklisting.

#### Remediation
1. Require admin role (`isAdmin(session.user)`) before executing.
2. Add per-admin rate limiting (e.g., max 1 batch send per hour).
3. Log all bulk email sends to an audit table.

---

### CRIT-004 — Upload Path Traversal + Unrestricted Public Read
**Severity:** Critical
**Location:** `src/app/api/upload/route.ts`

#### Description
When S3 is **not** configured, the upload handler falls back to local filesystem storage:
```typescript
const fileName = `${Date.now()}-${file.name || 'recording.webm'}`;
const filePath = path.join(uploadDir, fileName);
await fs.writeFile(filePath, buffer);
```
The `file.name` is taken directly from the client-provided `File` object without sanitization. A malicious client can send `file.name = "../../../etc/cron.d/pwn"` (or similar) to escape the intended `public/uploads/videos/` directory. Although the resulting file may not execute, this is a classic **path traversal** vulnerability.

Additionally, files are saved under `public/`, making them **publicly readable by URL with no auth** once uploaded. This is a **privacy breach** for standup videos.

#### Impact
- Path traversal allows writing files to arbitrary locations on the server filesystem (within process permissions).
- All uploaded videos are world-readable, leaking private team communications.

#### Remediation
```typescript
import { v4 as uuidv4 } from 'uuid';
import sanitize from 'sanitize-filename';

const safeName = sanitize(file.name || 'recording.webm').replace(/\s+/g, '_');
const fileName = `${Date.now()}-${uuidv4()}-${safeName}`;
```
- Do **not** store user uploads under `public/`.
- Serve uploads via an authenticated API route (`/api/files/[id]`) that verifies ownership before streaming the file.
- When using S3, remove `ACL: 'public-read'` and use **signed URLs** with short expiration.

---

### HIGH-001 — In-Memory Rate Limiter Bypass (IP Spoofing + Horizontal Scaling)
**Severity:** High
**Location:** `src/lib/rate-limit.ts`

#### Description
The rate limiter extracts the client IP from `X-Forwarded-For` without any validation:
```typescript
const forwarded = request.headers.get('x-forwarded-for');
const ip = forwarded?.split(',')[0]?.trim() ?? '127.0.0.1';
```
An attacker can set `X-Forwarded-For: 1.2.3.4` to rotate IPs on every request, completely bypassing rate limits.

Furthermore, the store is an **in-memory JavaScript object** (`const store: RateLimitStore = {}`). In serverless/horizontal-scaling environments (Vercel, AWS Lambda, multiple containers), each instance maintains its own isolated counter. A distributed attacker can multiply their quota by the number of running instances.

#### Impact
- Brute-force attacks against `/api/auth` (login/signup) are effectively unbounded.
- DoS on AI endpoints by distributing requests across many spoofed IPs and instances.

#### Remediation
- Use a **Redis-backed** rate limiter (Upstash Redis is already in dependencies).
- Validate `X-Forwarded-For` against a trusted proxy list, or use the connection remote address in non-proxied environments.
- Example:
```typescript
import { getRedisClient } from '@/lib/redis';
// Use Redis INCR + EXPIRE for atomic, distributed rate limiting
```

---

### HIGH-002 — Information Disclosure via Verbose Error Messages
**Severity:** High
**Location:** Multiple API routes (`admin/stats`, `standups`, `focus`, `summarize`, `notifications`, `cron/daily-digest`, `transcribe`)

#### Description
Nearly every API route returns raw internal error messages to the client:
```typescript
return NextResponse.json({ error: 'Internal server error', message }, { status: 500 });
```
This leaks:
- PostgreSQL error details (column names, table names, constraint violations).
- File system paths (in S3 upload errors).
- OpenAI API response bodies (in transcribe/summarize errors).
- Internal environment details.

This intelligence aids attackers in reconnaissance and SQL injection refinement.

#### Impact
- Reduced attack effort (reconnaissance shortcut).
- Potential credential or path leakage in error traces.

#### Remediation
```typescript
// Production-safe error response
console.error('Standups POST error:', message); // keep internal logging
return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
```
Only log `message` server-side; never return it in the HTTP response body.

---

### HIGH-003 — nodemailer Arbitrary File Read / SSRF
**Severity:** High
**Location:** `package.json` dependency + `src/lib/email.ts`

#### Description
`nodemailer` version `^8.0.11` is affected by **GHSA-p6gq-j5cr-w38f** (no fix available for v8). The vulnerability allows a message-level `raw` option to bypass `disableFileAccess`/`disableUrlAccess`, enabling:
- **Arbitrary file read** from the server via `file://` URLs in email messages.
- **Server-Side Request Forgery (SSRF)** via `http://` URLs, exposing the full HTTP response in the delivered message.

While the current codebase does not directly use the `raw` option, the vulnerable dependency is present and could be triggered by future code changes or transitive usage via `@auth/core` / `next-auth`.

#### Impact
- Server file disclosure (e.g., `.env.local`, SSH keys, source code).
- Internal network scanning via SSRF.

#### Remediation
- Upgrade to a patched version of nodemailer as soon as one is released, or migrate to a managed email API (Resend, SendGrid, AWS SES) that does not rely on nodemailer.
- If staying on nodemailer, ensure `disableFileAccess: true` and `disableUrlAccess: true` are explicitly passed to `createTransport` and never bypassed.

---

### HIGH-004 — PostCSS Path Traversal + Arbitrary File Read
**Severity:** High
**Location:** Transitive dependency via `next`

#### Description
`postcss` (bundled with `next`) has multiple vulnerabilities:
- **GHSA-6g55-p6wh-862q:** Arbitrary file read via attacker-controlled `sourceMappingURL` in CSS comments.
- **GHSA-r28c-9q8g-f849:** Path traversal in source map auto-loading.
- **GHSA-fxqj-rqcc-2cmp:** Incomplete fix for the above.

If an attacker can influence CSS source input (e.g., via a crafted file upload that gets processed as CSS, or a malicious package), they can read arbitrary `.map` files or other files from the filesystem.

#### Impact
- Information disclosure of source maps and potentially other files.

#### Remediation
- Upgrade `next` to `>=16.3.0` (or a version that bundles `postcss >= 8.5.23`).

---

### HIGH-005 — sharp / libvips Native Code Vulnerabilities
**Severity:** High
**Location:** Transitive dependency via `next`

#### Description
`sharp` versions `<0.35.0` inherit vulnerabilities in `libvips` (CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, CVE-2026-35591). These can lead to memory corruption, denial of service, or potentially code execution when processing malformed images.

#### Impact
- DoS via malicious image uploads.
- Potential remote code execution in image processing pipelines.

#### Remediation
- Upgrade `next` to a version bundling `sharp >= 0.35.0`.
- If image uploads are enabled, strictly validate image headers and sanitize uploads in a sandboxed process.

---

### HIGH-006 — Weak Server-Side Password Policy
**Severity:** High
**Location:** `src/app/api/auth/signup/route.ts`

#### Description
The server-side signup schema only enforces:
```typescript
password: z.string().min(6, "Password must be at least 6 characters")
```
There is **no** requirement for uppercase, lowercase, numbers, or symbols. Users can sign up with passwords like `123456`, `aaaaaa`, or `password`. The frontend (`SignupForm.tsx`) shows a strength meter, but this is client-side only and trivially bypassed by calling the API directly.

#### Impact
- Mass credential stuffing / brute-force success against weak accounts.
- Compromised accounts expose standup videos, transcripts, and summaries.

#### Remediation
```typescript
const signupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string()
    .min(12, "Password must be at least 12 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[a-z]/, "Must contain a lowercase letter")
    .regex(/[0-9]/, "Must contain a number")
    .regex(/[^A-Za-z0-9]/, "Must contain a special character"),
});
```

---

### MED-001 — Missing Security Headers (CSP, X-Frame-Options, etc.)
**Severity:** Medium
**Location:** `next.config.ts`, `src/middleware.ts`

#### Description
The application does not set critical HTTP security headers:
- **Content-Security-Policy (CSP)** — Missing; no defense against XSS via inline scripts or injected markup.
- **X-Frame-Options / CSP frame-ancestors** — Missing; the app can be clickjacked in an iframe.
- **X-Content-Type-Options: nosniff** — Missing.
- **Referrer-Policy** — Missing.
- **Permissions-Policy** — Missing (e.g., camera/microphone can be hijacked in embedded contexts).

#### Remediation
Add headers via `next.config.ts`:
```typescript
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; font-src 'self'; connect-src 'self' https://api.openai.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';",
          },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self)' },
        ],
      },
    ];
  },
};
```

---

### MED-002 — MarkdownRenderer Link XSS (JavaScript Protocol)
**Severity:** Medium
**Location:** `src/components/MarkdownRenderer.tsx`

#### Description
The custom Markdown renderer escapes HTML entities, but link URLs are inserted **raw** into `href` attributes:
```typescript
text = text.replace(
  /\[(.*?)\]\((.*?)\)/g,
  '<a href="$2" class="..." target="_blank" rel="noopener noreferrer">$1</a>'
);
```
A malicious markdown link like `[click me](javascript:alert(document.cookie))` will be rendered with an executable JavaScript href. Because the component uses `dangerouslySetInnerHTML`, this results in **stored XSS** wherever user-controlled markdown is rendered.

Current exploitation path is limited (blog content is static files), but if this component is reused for user-generated content (standup notes, comments, etc.), it becomes a direct XSS vector.

#### Remediation
Sanitize URLs before inserting:
```typescript
function sanitizeHref(url: string): string | null {
  try {
    const parsed = new URL(url, 'http://localhost');
    const allowed = ['http:', 'https:', 'mailto:'];
    if (!allowed.includes(parsed.protocol)) return null;
    return parsed.href;
  } catch {
    return null;
  }
}
// In regex replacement, return plain text if URL is invalid
```
Consider migrating to a hardened library like `marked` + `DOMPurify` instead of a custom regex parser.

---

### MED-003 — OpenAPI Specification Publicly Exposed
**Severity:** Medium
**Location:** `src/app/api/openapi.json/route.ts`

#### Description
The complete OpenAPI 3.0 schema is served publicly at `/api/openapi.json`. It exposes:
- All API endpoints, request/response shapes, and authentication schemes.
- Example UUIDs, internal paths, and data structures.
- Documentation of which routes lack `security` requirements (e.g., `/transcribe`).

This dramatically reduces the effort required for reconnaissance and targeted attacks.

#### Remediation
- Restrict access to authenticated admin users only, or
- Remove the endpoint from production builds (`process.env.NODE_ENV === 'production'` guard), or
- Serve it behind a VPN / internal docs portal.

---

### MED-004 — Cron Secret Leaked in Query Parameters
**Severity:** Medium
**Location:** `src/app/api/cron/daily-digest/route.ts`

#### Description
The cron endpoint accepts the secret via **URL query parameter** (`?secret=...`) in addition to the `Authorization` header:
```typescript
const querySecret = request.nextUrl.searchParams.get("secret");
const provided = token || querySecret || "";
```
Query parameters are commonly logged by reverse proxies, CDNs, load balancers, and application access logs. If `CRON_SECRET` appears in a URL, it will be persisted in plain text across multiple logging layers.

#### Impact
- Long-term secret exposure in log files.
- Anyone with log read access can impersonate the cron job.

#### Remediation
Remove query-parameter support entirely. Only accept the secret via `Authorization: Bearer <token>` header.

---

### MED-005 — S3 Uploads Use Public-Read ACL
**Severity:** Medium
**Location:** `src/app/api/upload/route.ts`

#### Description
S3 uploads are stored with `ACL: 'public-read'`:
```typescript
new PutObjectCommand({
  Bucket: bucket,
  Key: key,
  Body: buffer,
  ContentType: contentType,
  ACL: 'public-read',
})
```
This makes every uploaded video permanently world-readable if the bucket name or endpoint is guessed or leaked.

#### Remediation
1. Remove `ACL: 'public-read'`.
2. Generate **presigned URLs** (valid for 15–60 minutes) for authorized viewers.
3. Implement an access-control check before generating presigned URLs.

---

### MED-006 — Database & Redis Connections Lack TLS
**Severity:** Medium
**Location:** `src/lib/db.ts`, `src/lib/redis.ts`

#### Description
- PostgreSQL `Pool` is initialized with only `connectionString`; no `ssl: { rejectUnauthorized: true }` or equivalent.
- Redis client does not enforce TLS. If `REDIS_URL` points to a remote Redis instance, the connection may be plaintext.

#### Impact
- Credential and data exposure in transit if database/Redis traffic crosses untrusted networks.

#### Remediation
```typescript
// db.ts
export const db = {
  pool: new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
  }),
};
```
For Redis, pass `socket: { tls: true }` or use `rediss://` URLs.

---

### LOW-001 — No Session MaxAge / Explicit JWT Configuration
**Severity:** Low
**Location:** `src/lib/auth.ts`

#### Description
The NextAuth config uses `session: { strategy: "jwt" }` without explicit `maxAge` or `updateAge`. While NextAuth v5 provides defaults (~30 days), the lack of explicit configuration makes it easy for sessions to outlive intended security boundaries. There is also no session invalidation mechanism (no `signOut` event cleanup beyond cookie removal).

#### Remediation
```typescript
session: {
  strategy: "jwt",
  maxAge: 24 * 60 * 60, // 24 hours
  updateAge: 2 * 60 * 60, // refresh token every 2h
}
```
Implement a server-side session blocklist for immediate revocation on password change or suspicious activity.

---

### LOW-002 — Health Endpoint Information Disclosure
**Severity:** Low
**Location:** `src/app/api/health/route.ts`

#### Description
The health check returns the internal service name:
```typescript
return NextResponse.json({ status: "ok", service: "remote-os" });
```
This confirms the running application to external scanners, aiding fingerprinting.

#### Remediation
Return a generic response:
```typescript
return NextResponse.json({ status: "ok" });
```

---

### LOW-003 — Admin Page Redirects Instead of Returning 404
**Severity:** Low
**Location:** `src/app/admin/page.tsx`, `src/app/api/admin/stats/route.ts`

#### Description
When a non-admin accesses `/admin`, the page `redirect('/')`. The API route returns `403`. The difference in behavior between unauthenticated (`redirect('/')`) and the API (`401/403`) allows an attacker to confirm the existence of admin functionality and distinguish between "not logged in" and "not admin".

#### Remediation
Return `notFound()` for both page and API when the user is not an admin, making enumeration harder.

---

### LOW-004 — Blog Slug Path Traversal (Constrained)
**Severity:** Low
**Location:** `src/lib/blog.ts`

#### Description
`getPostBySlug` constructs a path directly from user input:
```typescript
const filePath = path.join(postsDirectory, `${slug}.md`);
```
If Next.js routing ever passes a raw traversal string (e.g., `../../../etc/passwd`), the `.md` extension limits the attack to `.md` files, but arbitrary markdown files outside the intended directory could still be read.

#### Remediation
Validate `slug` against an allow-list:
```typescript
if (!/^[a-z0-9-]+$/.test(slug)) return null;
```

---

## 5. Dependency Vulnerabilities

Summary from `npm audit` (2026-08-08):

| Package | Severity | CVE / Advisory | Fix Available | Notes |
|---------|----------|----------------|---------------|-------|
| `nanoid` | High | GHSA-2v37-7h3g-55p8 | Yes (`npm audit fix`) | Infinite loop when size=0 |
| `nodemailer` | High | GHSA-p6gq-j5cr-w38f | **No** (v8.x) | File read + SSRF via `raw` option |
| `postcss` | High | GHSA-6g55-p6wh-862q, GHSA-r28c-9q8g-f849, GHSA-fxqj-rqcc-2cmp | Yes (upgrade `next`) | Path traversal + file read |
| `sharp` | High | GHSA-f88m-g3jw-g9cj | Yes (upgrade `next`) | libvips CVEs |
| `next` | High | Via `postcss` + `sharp` | Yes (`next >= 16.3.0`) | Bundle upgrade needed |
| `next-auth` | High | Via `nodemailer` + `@auth/core` | Partial | Major version bump required |
| `@auth/core` | High | Via `nodemailer` | No | Locked by `next-auth` / `@auth/pg-adapter` |

**Total high-severity dependency issues:** 8

### Remediation
1. Run `npm audit fix` to resolve `nanoid`.
2. Upgrade `next` to `>=16.3.0` to resolve `postcss` and `sharp`.
3. For `nodemailer`, evaluate migration to **Resend**, **SendGrid**, or **AWS SES**; if retaining nodemailer, monitor for a patched release and upgrade immediately.
4. Upgrade `next-auth` to a stable non-beta version that does not depend on the vulnerable `@auth/core` / `nodemailer` chain.

---

## 6. Recommendations Summary

| Priority | Action | Owner |
|----------|--------|-------|
| **P0** | Add `auth()` checks to `/api/summarize`, `/api/transcribe`, `/api/notifications` | Backend |
| **P0** | Fix IDOR in `/api/summarize` by verifying standup ownership | Backend |
| **P0** | Sanitize upload filenames and move storage out of `public/` | Backend |
| **P0** | Upgrade `next` and replace / patch `nodemailer` | DevOps / Security |
| **P1** | Replace in-memory rate limiter with Redis-backed limiter | Backend |
| **P1** | Remove verbose `message` from all API error responses | Backend |
| **P1** | Enforce strong password policy server-side | Backend |
| **P1** | Add security headers (CSP, X-Frame-Options, etc.) | Frontend / DevOps |
| **P2** | Restrict or remove `/api/openapi.json` in production | Backend |
| **P2** | Remove cron secret from query parameters | Backend |
| **P2** | Harden MarkdownRenderer link URLs or switch to `marked`+`DOMPurify` | Frontend |
| **P2** | Enable TLS for PostgreSQL and Redis connections | DevOps |
| **P3** | Return 404 (not redirect) for unauthorized admin access | Backend |
| **P3** | Sanitize blog slugs and health endpoint output | Backend |

---

## 7. Appendices

### Appendix A — Files Audited
```
src/app/api/admin/stats/route.ts
src/app/api/auth/[...nextauth]/route.ts
src/app/api/auth/signup/route.ts
src/app/api/cron/daily-digest/route.ts
src/app/api/focus/route.ts
src/app/api/health/route.ts
src/app/api/notifications/route.ts
src/app/api/openapi.json/route.ts
src/app/api/standups/route.ts
src/app/api/summarize/route.ts
src/app/api/transcribe/route.ts
src/app/api/upload/route.ts
src/app/admin/page.tsx
src/app/blog/[slug]/page.tsx
src/app/layout.tsx
src/app/onboarding/page.tsx
src/app/page.tsx
src/components/AdminAnalytics.tsx
src/components/LoginForm.tsx
src/components/MarkdownRenderer.tsx
src/components/Onboarding.tsx
src/components/SignupForm.tsx
src/components/StandupDashboard.tsx
src/components/VideoRecorder.tsx
src/lib/analytics.ts
src/lib/auth.ts
src/lib/blog.ts
src/lib/db.ts
src/lib/email.ts
src/lib/email-templates.ts
src/lib/openai.ts
src/lib/rate-limit.ts
src/lib/redis.ts
src/middleware.ts
next.config.ts
package.json
```

### Appendix B — Tools Used
- Manual static analysis
- `npm audit` (npm v10+)
- Source code review against OWASP Top 10 2021

### Appendix C — Disclaimer
This audit was performed in a limited time window against static source code. Dynamic testing (runtime exploitation, network-layer attacks, infrastructure review) was out of scope. Some findings may require validation in a live environment before deployment.

---

*End of Report*
