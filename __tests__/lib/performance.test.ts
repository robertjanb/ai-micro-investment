import {
  addDays,
  calculateReturnPct,
  getConfidenceBucket,
  isWinningOutcome,
  normalizeDate,
} from '@/lib/performance'

describe('performance utils', () => {
  it('normalizes date to midnight', () => {
    const date = new Date('2026-02-08T17:42:12.000Z')
    const normalized = normalizeDate(date)

    expect(normalized.getHours()).toBe(0)
    expect(normalized.getMinutes()).toBe(0)
    expect(normalized.getSeconds()).toBe(0)
  })

  it('builds confidence buckets', () => {
    expect(getConfidenceBucket(57)).toBe('50-59')
    expect(getConfidenceBucket(83)).toBe('80-89')
    expect(getConfidenceBucket(100)).toBe('100-100')
  })

  it('calculates returns by action', () => {
    expect(calculateReturnPct('buy', 100, 110)).toBeCloseTo(10)
    expect(calculateReturnPct('sell', 100, 110)).toBeCloseTo(-10)
    expect(calculateReturnPct('sell', 100, 90)).toBeCloseTo(10)
    expect(calculateReturnPct('hold', 100, 102)).toBeCloseTo(2)
  })

  it('determines wins using action-specific logic', () => {
    expect(isWinningOutcome('buy', 1)).toBe(true)
    expect(isWinningOutcome('sell', 1)).toBe(true)
    expect(isWinningOutcome('hold', 1.5)).toBe(true)
    expect(isWinningOutcome('hold', 2.5)).toBe(false)
  })

  it('adds days without mutating original date', () => {
    const base = new Date('2026-02-08T00:00:00.000Z')
    const shifted = addDays(base, 7)

    expect(base.toISOString()).toBe('2026-02-08T00:00:00.000Z')
    expect(shifted.toISOString()).toBe('2026-02-15T00:00:00.000Z')
  })
})
