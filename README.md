# AI Micro-Investment Companion

A self-hosted Next.js app that generates daily investment ideas, tracks a portfolio/watchlist, provides AI-assisted recommendations, and scores recommendation performance over time.

This project is optimized for local/self-hosted deployment (including Unraid) with a local SQLite database.

## What This App Does

- Authenticated user accounts (email/password + reset flow).
- Daily stock idea generation (`safe` / `interesting` / `spicy`) with confidence scores and thesis/bear case.
- Portfolio management with manual holdings and price refresh.
- Watchlist management.
- AI chat and dashboard briefing.
- Recommendation engine (`buy` / `sell` / `hold`) for holdings and new opportunities.
- Performance Proof analytics:
  - recommendation snapshots
  - 1d / 7d / 30d outcome evaluation
  - confidence calibration
  - strategy scoreboards
  - reseedable mock history for testing.

## Tech Stack

- Framework: Next.js 14 (App Router) + React 18 + TypeScript
- Auth: NextAuth (credentials provider)
- ORM/DB: Prisma + SQLite
- Styling: Tailwind CSS
- Data providers:
  - `mock` mode: synthetic/internal data
  - `real` mode: Yahoo Finance + Finnhub + OpenRouter AI
- Deployment: Docker / Docker Compose / Unraid
- Registry CI: GitHub Actions -> GHCR

## App Structure

### UI Routes

- `/dashboard` main overview
- `/ideas` daily ideas
- `/portfolio` holdings + recommendations + ops status
- `/watchlist` watchlist items
- `/history` historical idea outcomes
- `/performance` performance analytics (new)
- `/settings` idea filter/preferences
- `/login`, `/register`, `/forgot-password`, `/reset-password`

### API Routes (selected)

Auth:
- `/api/auth/[...nextauth]`
- `/api/auth/register`
- `/api/auth/reset-password`

Core:
- `/api/ideas`
- `/api/watchlist`
- `/api/portfolio`
- `/api/portfolio/recommendations`
- `/api/portfolio/update-prices`
- `/api/history`
- `/api/chat`
- `/api/dashboard/briefing`

Performance Proof:
- `POST /api/performance/evaluate`
- `GET /api/performance/overview`
- `GET /api/performance/scoreboard`
- `GET /api/performance/recommendations`
- `POST /api/performance/reseed` (mock mode only)

Ops:
- `/api/cron/status`

## Data Source Modes

Set with `DATA_SOURCE`:

- `mock`: no external market APIs required; fastest for development/testing.
- `real`: uses OpenRouter, Yahoo Finance, Finnhub.

Recommendation: start with `mock` for local feature testing, then switch to `real` when validating production behavior.

## Local Development

## 1) Prerequisites

- Node 20+
- pnpm

## 2) Install

```bash
pnpm install
```

## 3) Configure environment

Create `.env.local` (or `.env`) with at least:

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<your-secret>"
DATA_SOURCE="mock"
PERFORMANCE_PROOF_ENABLED="true"
```

Optional/real mode:

```env
OPENROUTER_API_KEY="..."
AI_MODEL="anthropic/claude-sonnet-4-20250514"
FINNHUB_API_KEY="..."
APP_VERSION="0.1.0-local"
```

## 4) Sync DB schema

```bash
pnpm prisma db push
pnpm prisma generate
```

## 5) Run app

```bash
pnpm dev
```

Open: `http://localhost:3000`

## Scripts

- `pnpm dev` start local dev server
- `pnpm build` prisma generate + production build
- `pnpm start` run production server
- `pnpm lint` eslint
- `pnpm test` jest
- `pnpm db:push` prisma db push
- `pnpm db:generate` prisma generate
- `pnpm db:seed` seed script

## Performance Proof (How It Works)

### Concepts

- `RecommendationSnapshot`: immutable recommendation record at generation time.
- `RecommendationEvaluation`: horizon-specific score row (1d/7d/30d).

### Evaluation logic

- Buy: positive return is win.
- Sell: inverse return (down move after sell is good).
- Hold: win if return stays within +/-2%.
- Missing data beyond grace period is marked `missing` and excluded from win-rate math.

### Why numbers can look stalled

`Run Evaluation` is idempotent. If no additional rows are due, totals can remain unchanged.
Also, snapshot status stays `pending` until all configured horizons are resolved.

### Mock testing flow (recommended)

1. Set `DATA_SOURCE=mock`
2. Go to `/performance`
3. Click `Reseed Mock Data`
4. Click `Run Evaluation`

This creates backdated snapshots so 7d/30d views are populated immediately.

## Database Overview (Prisma)

Main entities:
- `User`
- `Idea`, `DailyIdeaBatch`, `PriceHistory`
- `WatchlistItem`
- `Holding`
- `Recommendation`
- `RecommendationSnapshot`, `RecommendationEvaluation`
- `CronJobStatus`
- `IdeaConfig`

Schema: `prisma/schema.prisma`

## Authentication + Access Control

- NextAuth credentials strategy.
- Middleware protects app routes and sensitive APIs.
- Middleware config: `middleware.ts`

## Versioning in UI

App header shows a version badge (`v...`).

Resolution order:
1. `NEXT_PUBLIC_APP_VERSION`
2. `APP_VERSION`
3. `package.json` `version`

Optional short SHA can be appended using `NEXT_PUBLIC_GIT_SHA` / `GIT_SHA` / `GITHUB_SHA`.

Version helper: `lib/version.ts`

## Docker / Unraid

### Local Docker Compose

Use `docker-compose.yml`:
- single app container
- SQLite at `/data/app.db`

### Unraid

Use `docker-compose.unraid.yml` and map:
- host path: `/mnt/user/appdata/ai-micro-investment`
- container path: `/data`

Detailed manual: `docs/UNRAID.md`

## GHCR Publishing + Updates

Workflow: `.github/workflows/publish-image.yml`

- Push to `main`:
  - publishes `ghcr.io/<owner>/<repo>:latest`
  - fast path defaults to `linux/amd64`
- Push tag `v*`:
  - publishes multi-arch release tags (`amd64` + `arm64`)

Build cache is enabled via GitHub Actions cache (`type=gha`) to speed repeat builds.

## Cron / Background Jobs

- Portfolio price refresh supports authenticated user run and secret-protected cron route.
- Performance evaluator supports authenticated run and secret-protected cron route.

For secret-based cron calls, configure `CRON_SECRET`.

## Troubleshooting

### `Error validating datasource db: URL must start with file:`

Your `DATABASE_URL` is still Postgres-style. Use SQLite format:
- local: `file:./dev.db`
- container: `file:/data/app.db`

### `unable to open database file: /data/app.db`

Volume mapping/permissions issue on host path.
Ensure `/data` maps to a writable directory.

### Performance page seems unchanged after `Run Evaluation`

Expected when no new horizons are due. Try:
- `DATA_SOURCE=mock`
- `Reseed Mock Data`
- rerun evaluation.

### Old version running on Unraid

Image reflects pushed Git commits only.
Update GHCR image and redeploy/pull latest in Unraid.

## Notes for Future Development

- Keep Prisma schema changes backward-compatible for SQLite-first deployments.
- Add integration tests around performance aggregation endpoints when extending analytics.
- If scaling beyond single host/write pattern, consider moving from SQLite to dedicated Postgres container.
