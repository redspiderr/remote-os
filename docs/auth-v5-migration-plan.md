# 🚀 REMOTE OS — next-auth v1 → v5 Migration Plan

**Project:** REMOTE OS v0.5.2
**Objective:** Upgrade next-auth from v1.12.1 (preview) to v5.0.0 (Auth.js stable)
**Timeline:** 1-2 days (8 phases)
**Risk:** MEDIUM — Breaking changes to auth flow

---

## 📋 Why Migrate?

| v1 (Current) | v5 (Target) |
|--------------|-------------|
| Preview version (2022) | Stable release (2024) |
| Depends on babel-core@5 (2015) | Modern dependencies |
| 15 npm CVEs | ~0-2 CVEs |
| Deprecated callbacks | Modern typed API |
| `getServerSession()` | `auth()` |
| `next-auth/react` | `@auth/react` |

**CVE Impact:** v1 depends on babel-core@5.x with CRITICAL arbitrary code execution vulnerability.

---

## 🔑 Key API Changes

### 1. Imports
```typescript
// BEFORE (v1)
import { getServerSession } from "next-auth/next";
import NextAuth from "next-auth";

// AFTER (v5)
import NextAuth from "next-auth";
import { auth } from "@/lib/auth"; // Uses auth() helper
```

### 2. Session Retrieval
```typescript
// BEFORE (v1)
const session = await getServerSession(req, res, authOptions);

// AFTER (v5)
const session = await auth();
```

### 3. Providers
```typescript
// BEFORE (v1)
GoogleProvider({ clientId: "", clientSecret: "" })

// AFTER (v5)
google({ clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! })
```

### 4. Database Adapter
```typescript
// BEFORE (v1)
import { PostgresAdapter } from "@auth/pg-adapter";

// AFTER (v5)
import PostgresAdapter from "@auth/pg-adapter"; // May need @auth/core adapter
```

### 5. Middleware
```typescript
// BEFORE (v1)
import { withAuth } from "next-auth/middleware";

// AFTER (v5)
import { auth } from "@/lib/auth"; // Custom middleware pattern
```

### 6. Sign-In / Sign-Up
```typescript
// BEFORE (v1)
import { signIn, signOut } from "next-auth/react";

// AFTER (v5)
import { signIn, signOut } from "@auth/react"; // Or similar
```

---

## 🗓️ Phase Breakdown (1-2 Days)

### Phase 0: Research & Prep (30 min)
- [ ] Read Auth.js v5 docs: https://authjs.dev/getting-started
- [ ] Check v5 compatibility with Next.js 16
- [ ] Review current auth flow in REMOTE OS
- **Output:** Research notes document

### Phase 1: Install New Dependencies (15 min)
```bash
# Remove old
npm uninstall next-auth @auth/pg-adapter

# Install new
npm install next-auth@5 @auth/core @auth/pg-adapter

# Verify no conflicts
npm ls next-auth
```
- **Risk:** Dependency conflicts with Next.js 16
- **Mitigation:** Test in separate branch

### Phase 2: Rewrite `src/lib/auth.ts` (2-3 hours)
- [ ] Create new config with v5 API
- [ ] Migrate Google provider
- [ ] Migrate callbacks (session, signIn, jwt)
- [ ] Remove deprecated options
- [ ] Add type definitions
- **Key Changes:**
  - `pages.signIn` → custom pages config
  - `session.strategy` → `session.strategy` (same)
  - `providers` → new provider syntax
  - `adapter` → compatible adapter

### Phase 3: Update Middleware (30 min)
- [ ] Rewrite `src/middleware.ts`
- [ ] Add auth check pattern
- [ ] Test public route handling
- **Changes:**
  - `withAuth` middleware → custom auth middleware
  - Pattern matching for `/admin`, `/dashboard`, etc.

### Phase 4: Update Components (1-2 hours)
- [ ] `AuthProvider.tsx` — Update provider import
- [ ] `LoginForm.tsx` — Update signIn() call
- [ ] `SignupForm.tsx` — Update signUp() if custom
- [ ] `UserBar.tsx` — Update session usage
- [ ] `Onboarding.tsx` — Update session checks
- **Changes:**
  - `useSession()` hook may change signature
  - `signIn("google")` may change to `signIn("google", { provider })`

### Phase 5: Update API Routes (1 hour)
- [ ] `/api/auth/[...nextauth]/route.ts` — May need rewrite
- [ ] `/api/standups/route.ts` — Update auth import
- [ ] `/api/summarize/route.ts` — Update auth import
- [ ] `/api/transcribe/route.ts` — Update auth import
- [ ] `/api/upload/route.ts` — Update auth import
- [ ] `/api/notifications/route.ts` — Update auth import
- **Pattern:** All `import { auth } from "@/lib/auth"` should work

### Phase 6: Update Tests (30 min)
- [ ] Fix `next-auth/react` mocks in `src/test/setup.ts`
- [ ] Update test expectations for session shape
- [ ] Verify LoginForm tests pass

### Phase 7: Database Compatibility Check (30 min)
- [ ] Verify @auth/pg-adapter v5 schema matches v1
- [ ] Check if migration needed
- [ ] Test user login after upgrade
- **Risk:** Database schema changes

### Phase 8: Build & Deploy (1 hour)
- [ ] Run `next build`
- [ ] Fix any TypeScript errors
- [ ] Fix any runtime errors
- [ ] Smoke test: login, logout, Google OAuth
- [ ] Verify session persistence
- [ ] Commit & push

---

## 🎯 Success Criteria

| Check | Status |
|-------|--------|
| `npm audit` shows 0-2 low severity | ⬜ |
| Build passes | ⬜ |
| Tests pass | ⬜ |
| Google OAuth login works | ⬜ |
| Email/password login works | ⬜ |
| Session persists across pages | ⬜ |
| Logout works | ⬜ |
| Middleware redirects unauth users | ⬜ |
| Admin access controlled | ⬜ |

---

## ⚠️ Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Next.js 16 incompatibility | MEDIUM | HIGH | Test in separate branch first |
| DB schema changes | LOW | HIGH | Backup DB before migration |
| Google OAuth config changes | MEDIUM | MEDIUM | Update Google Console settings |
| Session data shape changes | HIGH | MEDIUM | Update all session usage |
| Build breaks | HIGH | MEDIUM | Work in branch, fix iteratively |

---

## 🏗️ Migration Branch Strategy

```bash
# Create migration branch
git checkout -b feat/auth-v5-migration

# Work in phases, commit each phase
# Phase 1: Install dependencies
# Phase 2: Update auth.ts
# ... etc

# When ready, merge to main
git checkout main
git merge feat/auth-v5-migration
```

---

## 📚 Resources

- **Auth.js v5 Docs:** https://authjs.dev/getting-started
- **Next.js 16 + Auth.js:** https://authjs.dev/getting-started/installation?framework=next.js
- **Migration Guide:** https://authjs.dev/getting-started/migrating-to-v5
- **PostgreSQL Adapter:** https://authjs.dev/getting-started/adapters/pg
- **GitHub Discussion:** https://github.com/nextauthjs/next-auth/discussions

---

## 🗓️ Suggested Sprint Planning

**Day 1 (Morning):**
- Phase 0: Research (30 min)
- Phase 1: Install (15 min)
- Phase 2: Rewrite auth.ts (3 hours)
- Phase 3: Middleware (30 min)

**Day 1 (Afternoon):**
- Phase 4: Components (2 hours)
- Phase 5: API routes (1 hour)
- Phase 6: Tests (30 min)

**Day 2 (Morning):**
- Phase 7: DB check + testing (2 hours)
- Phase 8: Build + deploy (2 hours)
- Buffer for fixes (2 hours)

**Total: 1.5-2 days**

---

## 💰 Cost Impact

- **Dev Time:** ~16 hours × $50/hour = $800
- **Risk:** Low (well-documented migration)
- **Benefit:** Eliminates 15 CVEs, modern auth, long-term stability
- **ROI:** HIGH — security + maintenance savings

---

**Plan created:** 2026-08-09
**Estimated start:** After current sprint
**Priority:** P1 (Important, not urgent)

