# CLAUDE.md — AI Micro-Investment Companion

This file provides guidance for AI assistants working on this codebase.

## Project Overview

AI Micro-Investment Companion is a full-stack **Next.js 14** application (App Router) written in **TypeScript**. It provides daily AI-generated investment ideas, portfolio tracking, watchlist management, and an AI-powered chat consultant. The app uses **SQLite** via **Prisma ORM** and integrates with LLMs through **OpenRouter**.

## Quick Reference — Commands

```bash
pnpm install              # Install dependencies (pnpm is the package manager)
pnpm run dev              # Start dev server on :3000
pnpm run build            # Generate Prisma client + build Next.js
pnpm run start            # Run production build
pnpm run lint             # ESLint (next/core-web-vitals)
pnpm run test             # Run Jest test suite
pnpm run db:generate      # Generate Prisma client
pnpm run db:push          # Push schema to database
pnpm run db:seed          # Seed database with sample data (tsx prisma/seed.ts)
```

**Important:** `pnpm run build` runs `prisma generate` before `next build`. Always run `pnpm run db:generate` after schema changes.

## Repository Structure

```
├── app/                    # Next.js App Router (pages + API routes)
│   ├── (auth)/             # Public auth pages: login, register, forgot/reset-password
│   ├── (main)/             # Protected pages: dashboard, ideas, portfolio, watchlist, history, settings
│   ├── api/                # API route handlers (see API Routes below)
│   ├── globals.css         # Global styles + Tailwind + design tokens
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Root redirect
├── components/             # React components organized by feature
│   ├── auth/               # LogoutButton
│   ├── chat/               # ChatInterface, Message
│   ├── dashboard/          # AIBriefing, ActivityFeed, MarketNews, PortfolioSnapshot, etc.
│   ├── ideas/              # IdeaCard, ConfidenceScore
│   ├── portfolio/          # AddHoldingForm, HoldingCard, PortfolioSummary, RecommendationCard, etc.
│   ├── watchlist/          # WatchlistItem
│   ├── onboarding/         # WelcomeMessage
│   ├── providers/          # SessionProvider (NextAuth)
│   └── ui/                 # Reusable chart components (AreaChart, DonutChart, Sparkline)
├── lib/                    # Backend utilities and services
│   ├── ai/                 # LLM integration: claude.ts, prompts.ts, truncate-conversation.ts
│   ├── data-sources/       # Pluggable data providers (mock/ and real/)
│   ├── auth.ts             # NextAuth configuration
│   ├── prisma.ts           # Prisma client singleton
│   ├── rate-limit.ts       # In-memory rate limiting
│   ├── validation.ts       # Zod schemas for API input validation
│   └── idea-config.ts      # Idea screening filter config with in-memory cache
├── prisma/
│   ├── schema.prisma       # Database schema (10 models)
│   └── seed.ts             # Seed data
├── types/
│   └── next-auth.d.ts      # NextAuth type extensions
├── __tests__/lib/          # Jest tests (4 test files)
├── scripts/                # Utility scripts (clear-today-ideas.ts)
├── docs/                   # Documentation (UNRAID.md)
├── middleware.ts            # Route protection via NextAuth
├── next.config.js          # output: 'standalone' for Docker
├── tailwind.config.ts      # Custom design tokens via CSS variables
├── jest.config.js          # ts-jest, Node env, @/ path alias
├── Dockerfile              # Multi-stage build (Node 20 Alpine)
├── docker-compose.yml      # Local Docker development
└── docker-compose.unraid.yml  # Unraid deployment
```

## Architecture & Key Patterns

### Data Source Provider Pattern

The app uses a **pluggable provider pattern** controlled by the `DATA_SOURCE` env var (`"mock"` or `"real"`):

- **`lib/data-sources/mock/`** — Generates fictional ideas via AI, randomized prices. Default for development.
- **`lib/data-sources/real/`** — Uses Yahoo Finance for prices, Finnhub for news/sentiment, AI for thesis generation.
- **`lib/data-sources/index.ts`** — Factory functions: `getIdeaProvider()`, `getPriceProvider()`, `getSignalProvider()`, `getRecommendationProvider()`.
- **`lib/data-sources/types.ts`** — Shared interfaces all providers implement.

### AI Integration

- LLM calls go through **OpenRouter** (`lib/ai/claude.ts`) using the Vercel AI SDK (`@ai-sdk/openai`, `ai`).
- Default model: `anthropic/claude-sonnet-4-20250514` (configurable via `AI_MODEL` env var).
- All prompts are centralized in `lib/ai/prompts.ts`.
- Conversation context is managed with `lib/ai/truncate-conversation.ts` (150k token window).
- Retry logic with exponential backoff (3 attempts).

### Authentication

- **NextAuth v4** with Credentials provider (email + bcrypt password).
- JWT sessions with `tokenVersion` for invalidation.
- `middleware.ts` protects all `/dashboard`, `/ideas`, `/portfolio`, `/watchlist`, `/history`, `/settings` routes and their API counterparts.
- All API routes verify session via `getSession()`.

### Database

- **SQLite** via Prisma ORM. Database file configured by `DATABASE_URL` (default: `file:./dev.db`).
- Schema at `prisma/schema.prisma` with 10 models: `User`, `Conversation`, `Message`, `Idea`, `DailyIdeaBatch`, `PriceHistory`, `WatchlistItem`, `Holding`, `Recommendation`, `CronJobStatus`, `IdeaConfig`.
- After schema changes: run `pnpm run db:generate` then `pnpm run db:push`.

### Caching Strategy

- **Idea config:** 5 min in-memory TTL (`lib/idea-config.ts`)
- **AI briefing:** 2 hours per user
- **Stock screener results:** 1 hour
- **Fundamentals data:** 4 hours
- **Daily ideas:** Generated once per day, cached in DB via `DailyIdeaBatch`
- **Recommendations:** Generated once per day per user

### Rate Limiting

In-memory rate limiter (`lib/rate-limit.ts`) applied per-endpoint:

| Endpoint | Limit |
|---|---|
| Login | 10/min per email |
| Register | 5/min per IP |
| Chat | 20/min per user |
| Ideas | 60/min per user |
| Portfolio quotes | 30/min per user |
| Portfolio refresh | 6/min per user |

## API Routes

| Method | Path | Purpose |
|---|---|---|
| `*` | `/api/auth/[...nextauth]` | NextAuth handler |
| `POST` | `/api/auth/register` | User registration |
| `POST` | `/api/auth/reset-password` | Password reset |
| `POST` | `/api/chat` | AI chat (streaming) |
| `GET` | `/api/cron/status` | Cron job status |
| `GET` | `/api/dashboard/briefing` | AI daily briefing |
| `GET` | `/api/ideas` | Get/generate today's ideas |
| `GET` | `/api/ideas/[id]` | Get specific idea |
| `GET` | `/api/portfolio` | List holdings + summary |
| `POST` | `/api/portfolio` | Add holding |
| `GET/PUT/DELETE` | `/api/portfolio/[id]` | CRUD single holding |
| `GET` | `/api/portfolio/quote` | Stock quote lookup |
| `POST` | `/api/portfolio/update-prices` | Refresh all holding prices |
| `GET` | `/api/portfolio/recommendations` | AI buy/sell/hold recommendations |
| `GET` | `/api/watchlist` | List watchlist |
| `POST` | `/api/watchlist` | Add to watchlist |
| `DELETE` | `/api/watchlist/[id]` | Remove from watchlist |
| `GET` | `/api/history` | Idea performance history |
| `GET/PUT` | `/api/settings/idea-config` | Screening filter config |
| `DELETE` | `/api/user/delete` | Delete account |

## Testing

Tests live in `__tests__/lib/` and use **Jest** with **ts-jest**:

```bash
pnpm run test             # Run all tests
pnpm run test -- --watch  # Watch mode
```

Current test files:
- `rate-limit.test.ts` — Rate limiting logic
- `validation.test.ts` — Zod schema validation
- `prompts.test.ts` — AI prompt generation
- `truncate-conversation.test.ts` — Context window management

Tests use the `@/*` path alias (configured in `jest.config.js`).

## Environment Variables

Required variables (see `.env.example`):

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="<random-32-chars>"
NEXTAUTH_URL="http://localhost:3000"
OPENROUTER_API_KEY="sk-or-v1-..."
AI_MODEL="anthropic/claude-sonnet-4-20250514"
DATA_SOURCE="mock"                    # "mock" or "real"
FINNHUB_API_KEY="<key>"              # Required only for real data source
```

## Styling Conventions

- **Tailwind CSS** with custom design tokens defined as CSS variables in `globals.css`.
- Custom utility classes: `.app-card`, `.app-pill`, `.font-display`.
- Fonts: **Manrope** (body), **Sora** (display headings).
- Dark mode via Tailwind `class` strategy.

## Code Conventions

- **TypeScript strict mode** is enabled.
- **Path alias:** `@/*` maps to the project root (e.g., `import { prisma } from '@/lib/prisma'`).
- **Validation:** API inputs validated with Zod schemas (`lib/validation.ts`).
- **Error handling:** API routes return `NextResponse.json()` with appropriate status codes.
- **Component organization:** Feature-based directories under `components/`.
- **No barrel exports:** Components are imported directly from their file paths.
- **Package manager:** pnpm (lock file: `pnpm-lock.yaml`).

## Docker & Deployment

- **Dockerfile:** Multi-stage build (Node 20 Alpine) with `corepack` for pnpm.
- **`next.config.js`:** `output: 'standalone'` for optimized container builds.
- **`docker-entrypoint.sh`:** Runs `prisma db push` on startup, then starts the app.
- **Persistent storage:** SQLite DB mounted at `/data` in containers.
- **CI/CD:** GitHub Actions (`.github/workflows/publish-image.yml`) — publishes to `ghcr.io` on push to main or version tags.
- **Platforms:** amd64 (default), arm64 (on release tags or manual dispatch).

## Common Tasks for AI Assistants

### Adding a new API route
1. Create route file in `app/api/<resource>/route.ts`.
2. Add session check with `getSession()` for protected routes.
3. Add Zod validation for request bodies in `lib/validation.ts`.
4. Add rate limiting if the endpoint is user-facing.
5. Update `middleware.ts` matcher if the new path needs auth protection.

### Adding a new database model
1. Add model to `prisma/schema.prisma`.
2. Run `pnpm run db:generate && pnpm run db:push`.
3. Import `prisma` from `@/lib/prisma` (singleton).

### Adding a new page
1. Create `app/(main)/<page>/page.tsx` for protected pages or `app/(auth)/<page>/page.tsx` for public pages.
2. Protected pages are auto-covered by `middleware.ts` (matcher includes `/dashboard/:path*`, etc. — add new paths if needed).

### Modifying AI behavior
1. Edit prompts in `lib/ai/prompts.ts`.
2. Test prompt changes by running `pnpm run test` (covers prompt generation).
3. The chat system prompt includes the user's portfolio and today's ideas for context.

### Working with data sources
1. Both `mock/` and `real/` providers implement interfaces from `lib/data-sources/types.ts`.
2. Toggle between them via the `DATA_SOURCE` env var.
3. When adding a new data method, implement it in both mock and real providers.
