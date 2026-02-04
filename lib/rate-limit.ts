interface RateLimitEntry {
  count: number
  resetAt: number
}

// Note: In-memory rate limiting is per-process only. In a serverless/multi-instance
// deployment, each instance has its own store. For production, consider using
// Redis or a database-backed rate limiter (e.g. @upstash/ratelimit).
const store = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  store.forEach((entry, key) => {
    if (entry.resetAt < now) {
      store.delete(key)
    }
  })
}, 300000)

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + config.windowMs })
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs }
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt }
}

export const CHAT_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 20,
  windowMs: 60000,
}

export const IDEAS_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 60,
  windowMs: 60000,
}
