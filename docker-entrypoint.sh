#!/bin/sh
set -eu

mkdir -p /data

# Bind mounts on Unraid are often created with root ownership.
# Ensure the app user can write the SQLite database path.
chown -R nextjs:nodejs /data || true

if [ ! -w /data ]; then
  echo "ERROR: /data is not writable. Check your Unraid volume mapping and permissions."
  ls -ld /data || true
  id || true
  exit 1
fi

su-exec nextjs pnpm prisma db push
exec su-exec nextjs pnpm start
