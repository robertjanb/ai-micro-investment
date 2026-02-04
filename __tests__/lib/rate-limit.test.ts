import { checkRateLimit } from '@/lib/rate-limit'

describe('checkRateLimit', () => {
  const config = { maxRequests: 3, windowMs: 60000 }

  it('allows requests within the limit', () => {
    const key = `test-allow-${Date.now()}`
    const r1 = checkRateLimit(key, config)
    const r2 = checkRateLimit(key, config)
    const r3 = checkRateLimit(key, config)

    expect(r1.allowed).toBe(true)
    expect(r1.remaining).toBe(2)
    expect(r2.allowed).toBe(true)
    expect(r2.remaining).toBe(1)
    expect(r3.allowed).toBe(true)
    expect(r3.remaining).toBe(0)
  })

  it('blocks requests exceeding the limit', () => {
    const key = `test-block-${Date.now()}`
    checkRateLimit(key, config)
    checkRateLimit(key, config)
    checkRateLimit(key, config)
    const r4 = checkRateLimit(key, config)

    expect(r4.allowed).toBe(false)
    expect(r4.remaining).toBe(0)
  })

  it('resets after the window expires', () => {
    const key = `test-reset-${Date.now()}`
    const shortConfig = { maxRequests: 1, windowMs: 50 }

    const r1 = checkRateLimit(key, shortConfig)
    expect(r1.allowed).toBe(true)

    const r2 = checkRateLimit(key, shortConfig)
    expect(r2.allowed).toBe(false)

    // Manually expire the window by waiting
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const r3 = checkRateLimit(key, shortConfig)
        expect(r3.allowed).toBe(true)
        resolve()
      }, 60)
    })
  })

  it('tracks different keys independently', () => {
    const key1 = `test-key1-${Date.now()}`
    const key2 = `test-key2-${Date.now()}`
    const oneConfig = { maxRequests: 1, windowMs: 60000 }

    checkRateLimit(key1, oneConfig)
    const r1 = checkRateLimit(key1, oneConfig)
    const r2 = checkRateLimit(key2, oneConfig)

    expect(r1.allowed).toBe(false)
    expect(r2.allowed).toBe(true)
  })

  it('returns a future resetAt timestamp', () => {
    const key = `test-timestamp-${Date.now()}`
    const before = Date.now()
    const result = checkRateLimit(key, config)

    expect(result.resetAt).toBeGreaterThanOrEqual(before + config.windowMs)
  })
})
