# AI Micro-Investment Companion

A Next.js application that provides AI-powered micro-investment ideas and portfolio management, using Claude via OpenRouter.

## Prerequisites

- **Node.js** 20+
- **pnpm** (install with `npm i -g pnpm`)

## Quick Start

```bash
# 1. Install dependencies and set up the database
pnpm setup

# 2. Configure your environment
#    Edit .env and add your OpenRouter API key (get one at https://openrouter.ai/keys)
#    Or leave DATA_SOURCE="mock" to use mock data without any API keys

# 3. Start the dev server
pnpm dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | SQLite path. Default: `file:./dev.db` |
| `OPENROUTER_API_KEY` | Yes* | API key from [OpenRouter](https://openrouter.ai/keys). Required for AI features. |
| `AI_MODEL` | No | Model to use via OpenRouter. Default: `anthropic/claude-sonnet-4-20250514` |
| `NEXTAUTH_SECRET` | Yes | Session encryption key. Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Yes | App URL. Default: `http://localhost:3000` |
| `DATA_SOURCE` | No | `mock` (default) or `real`. Mock mode needs no external API keys for market data. |
| `FINNHUB_API_KEY` | If real | Required when `DATA_SOURCE="real"`. Free key at [finnhub.io](https://finnhub.io/register). |

## Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run tests |
| `pnpm setup` | Install deps + create DB + seed data |
| `pnpm db:generate` | Regenerate Prisma client |
| `pnpm db:push` | Sync schema to database |
| `pnpm db:seed` | Seed sample investment ideas |

## Project Structure

```
app/
  (auth)/          # Login, register, password reset
  (main)/          # Protected routes (dashboard, portfolio, ideas, etc.)
  api/             # API routes (auth, chat, ideas, portfolio, etc.)
components/        # React components (chat, dashboard, portfolio, etc.)
lib/
  ai/              # Claude integration via OpenRouter
  data-sources/    # Pluggable market data providers (real/mock)
prisma/
  schema.prisma    # Database schema
  seed.ts          # Sample data seeder
```

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database:** SQLite via Prisma ORM
- **Auth:** NextAuth.js (credentials + JWT)
- **AI:** Claude via OpenRouter (Vercel AI SDK)
- **Market Data:** Yahoo Finance + Finnhub (or mock)
- **Styling:** Tailwind CSS

## Docker

For Docker/self-hosted deployment, see [docs/UNRAID.md](docs/UNRAID.md).

```bash
docker compose up
```
