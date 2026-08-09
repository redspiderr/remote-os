# Deploying Remote OS on Coolify VPS (Port 3535)

This guide provides step-by-step instructions for deploying **Remote OS** on a **Coolify VPS** instance configured to listen on **port 3535**.

---

## Overview

Remote OS requires:
- **Node.js (Next.js 16)** app server running on **Port 3535**
- **PostgreSQL 16** (Database)
- **Redis 7** (Cache / Session state)

Coolify supports deploying Remote OS using two methods:
1. **Docker Compose Stack (Recommended)**: Runs Next.js, Postgres, and Redis together using `docker-compose.coolify.yml`.
2. **Standalone Container**: Builds the Next.js container via `Dockerfile` and connects to external or Coolify-managed Postgres and Redis services.

---

## Quick Deployment Steps (Docker Compose Stack)

### Step 1: Add New Project in Coolify
1. Log in to your **Coolify Dashboard**.
2. Click **Projects** → Select your project (or **Add Project**).
3. Click **+ New** → Select **Service** or **Public Repository / Private Repository**.

### Step 2: Configure Repository & Compose File
1. Connect your Git Repository (`remote-os`).
2. Set the build pack / deployment type to **Docker Compose**.
3. Point to `docker-compose.coolify.yml` (or `docker-compose.yml`).

### Step 3: Set Environment Variables
In the Coolify Environment Variables settings for your application stack, add the following variables (refer to `.env.example`):

| Variable | Recommended Value | Description |
| :--- | :--- | :--- |
| `PORT` | `3535` | Container and app port |
| `NODE_ENV` | `production` | Node production environment |
| `NEXTAUTH_URL` | `https://your-domain.com` or `http://<VPS_IP>:3535` | Public application URL for Auth |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.com` or `http://<VPS_IP>:3535` | Public frontend URL |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` | Auth encryption secret |
| `POSTGRES_USER` | `remoteos` | Database username |
| `POSTGRES_PASSWORD` | `<STRONG_PASSWORD>` | Database user password |
| `POSTGRES_DB` | `remoteos` | Database name |
| `DATABASE_URL` | `postgresql://remoteos:<STRONG_PASSWORD>@postgres:5432/remoteos` | Database connection string |
| `REDIS_URL` | `redis://redis:6379` | Redis connection string |
| `OPENAI_API_KEY` | `sk-proj-...` | Required for Whisper & GPT summaries |
| `INTEGRATION_SECRET` | `<32_CHAR_STRING>` | Token encryption key |

### Step 4: Configure Routing & Port 3535 in Coolify
1. In Coolify's resource settings for the `app` service:
   - **Internal / Destination Port**: Set to `3535`.
   - **Exposed Port**: Set to `3535` if accessing directly via IP (`http://<VPS_IP>:3535`).
   - If using a domain with SSL: Set your domain (e.g., `https://remoteos.yourdomain.com`), and Coolify's reverse proxy will route HTTP/HTTPS traffic to internal port `3535`.

### Step 5: Deploy Stack
1. Click **Deploy**.
2. Coolify will build the container from `Dockerfile`, initialize PostgreSQL schema (`db/schema.sql`) & seeds (`db/seed.sql`), and launch the services.
3. Monitor logs to verify healthchecks pass:
   - App healthcheck endpoint: `GET /api/health`

---

## Standalone Deployment (Coolify-Managed Databases)

If you prefer using Coolify's managed PostgreSQL and Redis instances:

1. Create a **PostgreSQL 16** database in Coolify.
2. Create a **Redis 7** database in Coolify.
3. Add a new **Application** (Dockerfile source):
   - Set **Docker Build Context**: `./`
   - Set **Dockerfile**: `Dockerfile`
   - Set **Exposed Port**: `3535`
   - Set **Environment Variables**:
     - `PORT=3535`
     - `DATABASE_URL` = (Coolify PostgreSQL internal connection string)
     - `REDIS_URL` = (Coolify Redis internal connection string)
     - `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `OPENAI_API_KEY`, etc.
4. Deploy the application.

---

## Health Check & Troubleshooting

- **Health Check Endpoint**:  
  `http://<VPS_IP>:3535/api/health` returns `200 OK` with JSON status when healthy:
  ```json
  { "status": "ok", "timestamp": "..." }
  ```
- **Port Conflicts**:  
  Verify no other service on the VPS is using port 3535:
  ```bash
  sudo netstat -tulpn | grep 3535
  ```
- **Database Migrations**:  
  When using `docker-compose.coolify.yml`, database tables are initialized automatically from `db/schema.sql`.
- **Build-Time Environment Variables (`NODE_ENV=production`)**:  
  Coolify automatically injects `NODE_ENV=production` as a build argument. The `Dockerfile` explicitly enforces `ENV NODE_ENV=development` during the `deps` stage so `devDependencies` (TypeScript, build tools) are installed for `npm run build`, and then prunes `devDependencies` before assembling the final runner stage.

---

REMOTE OS · Coolify VPS Deployment Guide
