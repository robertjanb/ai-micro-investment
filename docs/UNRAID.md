# Unraid Deployment Manual

## 1) Prerequisites

- Unraid with Docker enabled
- GitHub repo connected (this repo)
- A persistent appdata path, for example:
  - `/mnt/user/appdata/ai-micro-investment`
- `NEXTAUTH_SECRET` value (generate with `openssl rand -base64 32`)
- `OPENROUTER_API_KEY`
- Optional if `DATA_SOURCE=real`: `FINNHUB_API_KEY`

## 2) Required Container Settings

- Container port: `3000`
- Host port: choose one (example: `3000`)
- Persistent path mapping:
  - Host: `/mnt/user/appdata/ai-micro-investment`
  - Container: `/data`
- Database URL (must point to mapped volume):
  - `DATABASE_URL=file:/data/app.db`

## 3) Environment Variables

Set these in Unraid container config:

- `DATABASE_URL=file:/data/app.db`
- `NEXTAUTH_URL=https://your-domain-or-ip`
- `NEXTAUTH_SECRET=<your-generated-secret>`
- `OPENROUTER_API_KEY=<your-openrouter-key>`
- `AI_MODEL=anthropic/claude-sonnet-4-20250514`
- `DATA_SOURCE=real` or `DATA_SOURCE=mock`
- `FINNHUB_API_KEY=<optional-required-if-real>`

## 4) Deploy with Unraid Compose Manager (recommended)

1. Install/enable Compose Manager in Unraid (if not already enabled).
2. Use `docker-compose.unraid.yml` from this repo (or paste this content):

```yaml
version: '3.8'
services:
  app:
    image: ghcr.io/robertjanb/ai-micro-investment:latest
    container_name: ai-micro-investment
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=file:/data/app.db
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
      - AI_MODEL=${AI_MODEL:-anthropic/claude-sonnet-4-20250514}
      - DATA_SOURCE=${DATA_SOURCE:-real}
      - FINNHUB_API_KEY=${FINNHUB_API_KEY}
    volumes:
      - /mnt/user/appdata/ai-micro-investment:/data
```

3. Set the required env vars in Compose Manager.
4. Start the stack.
5. On first boot, container runs `prisma db push` automatically and creates `/data/app.db`.

## 5) Connect repo updates to Unraid updates

This repo now includes a GitHub Actions workflow at `.github/workflows/publish-image.yml`.

- Push to `main`:
  - publishes `ghcr.io/robertjanb/ai-micro-investment:latest`
  - publishes a commit tag like `sha-<commit>`
- Push a git tag like `v1.2.0`:
  - publishes `ghcr.io/robertjanb/ai-micro-investment:v1.2.0`

On Unraid:

1. Use image `ghcr.io/robertjanb/ai-micro-investment:latest` for auto-latest updates, or pin a specific version tag.
2. Click `Check for Updates` and then `Update` in Docker/Compose Manager to pull the new image.
3. Restart container/stack.

## 6) Deploy with Unraid Docker UI (no compose)

1. Add container.
2. Image: `ghcr.io/robertjanb/ai-micro-investment:latest`
3. Port mapping:
   - Host `3000` -> Container `3000`
4. Path mapping:
   - Host `/mnt/user/appdata/ai-micro-investment` -> Container `/data`
5. Add env vars from section 3.
6. Start container.

## 7) Verify Startup

- Check container logs for:
  - Prisma schema sync success
  - Next.js server listening on `0.0.0.0:3000`
- Open `http://<unraid-ip>:3000` or your reverse-proxy URL.

## 8) Backups

The database is a single file:

- `/mnt/user/appdata/ai-micro-investment/app.db`

Back up this file regularly (while container is stopped for safest snapshot).

## 9) Common Issues

- `Error validating datasource db: URL must start with file:`:
  - `DATABASE_URL` is not SQLite format. Use `file:/data/app.db`.
- `attempt to write a readonly database`:
  - Host appdata path permissions do not allow writes from container.
- Login/session issues:
  - `NEXTAUTH_URL` does not match your real URL.
- Image pulls fail in Unraid:
  - GHCR package may still be private. Make package public in GitHub package settings, or configure registry auth in Unraid.
