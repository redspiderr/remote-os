# REMOTE OS — Async Video Standups MVP

**Tech:** Next.js 16 + React 19 + TypeScript + Tailwind CSS v4 + PostgreSQL 16 + Redis 7  
**Feature:** WebRTC-based async video standup recording with Whisper transcription & GPT summaries

## Quick Start (Docker)

```bash
cp .env.example .env
# edit .env with your OPENAI_API_KEY and NEXTAUTH_SECRET

docker compose up --build -d
```

Services:
- **App** → http://localhost:3535 (or custom `$PORT`)
- **PostgreSQL** → localhost:5432
- **Redis** → localhost:6379

Health checks run on all services. The app waits for Postgres & Redis to be healthy before starting.

## Coolify VPS Deployment

For deploying on a Coolify VPS on port 3535, refer to the step-by-step guide in [docs/COOLIFY_DEPLOYMENT.md](file:///c:/Users/ramir/Documents/GitHub/remote-os/docs/COOLIFY_DEPLOYMENT.md) or use `docker-compose.coolify.yml`.

## Local Dev (no Docker)

```bash
npm install
npm run dev
```

Requires Postgres + Redis running locally and `DATABASE_URL` / `REDIS_URL` set in `.env`.

## Database

- Schema: `db/schema.sql` (auto-applied on Postgres container startup)
- Seed: `db/seed.sql` (3 users, 2 teams, 5 standups)
- UUID primary keys, JSONB team settings, status enum constraint

## Environment Variables

Copy `.env.example` to `.env` and fill in:

- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `OPENAI_API_KEY` — Whisper + GPT APIs
- `NEXTAUTH_SECRET` — `openssl rand -base64 32`

## Project Structure

```
src/
  app/
    layout.tsx            # Root layout (dark theme)
    page.tsx              # Standup page
    globals.css           # Tailwind + custom vars
    api/
      health/route.ts     # Health check for Docker
      transcribe/route.ts # Whisper transcription
  components/
    VideoRecorder.tsx     # Core WebRTC component
db/
  schema.sql            # Teams, users, standups tables
  seed.sql              # Mock data
docker-compose.yml      # Postgres + Redis + Next.js
Dockerfile              # Multi-stage production build
```

## Features (MVP v0.1.0)

- 🎥 **WebRTC Recording** — 90-second max, live preview
- ⏱️ **Countdown Timer** — visual badge during recording
- ⏯️ **Play / Pause / Resume / Stop** controls
- 📥 **Download** recorded video locally
- 🌑 **Dark Theme** — consistent with Pipeline Studio brand
- 🐳 **Docker Stack** — PostgreSQL + Redis + Next.js with healthchecks

## Next Steps (Post-MVP)

- S3 video upload
- Team dashboard with real data
- NextAuth user authentication
- Real-time standup notifications

---

REMOTE OS · MEDINA OS · Greyjoy Team
