import type { RecommendationSnapshot } from '@prisma/client'

export const PERFORMANCE_HORIZONS = [1, 7, 30] as const
export const HOLD_WIN_THRESHOLD_PCT = 2
export const EVALUATION_GRACE_HOURS = 72

export function isPerformanceProofEnabled(): boolean {
  return process.env.PERFORMANCE_PROOF_ENABLED !== 'false'
}

export function normalizeDate(date = new Date()): Date {
  const normalized = new Date(date)
  normalized.setHours(0, 0, 0, 0)
  return normalized
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function getConfidenceBucket(confidence: number): string {
  const bounded = Math.max(0, Math.min(100, Math.floor(confidence)))
  const floor = Math.floor(bounded / 10) * 10
  const ceiling = floor === 100 ? 100 : floor + 9
  return `${floor}-${ceiling}`
}

export function calculateReturnPct(
  action: RecommendationSnapshot['action'],
  entryPrice: number,
  exitPrice: number
): number {
  if (!Number.isFinite(entryPrice) || entryPrice <= 0 || !Number.isFinite(exitPrice)) {
    return 0
  }

  const longReturn = ((exitPrice - entryPrice) / entryPrice) * 100

  if (action === 'sell') {
    return -longReturn
  }

  if (action === 'hold') {
    return longReturn
  }

  return longReturn
}

export function isWinningOutcome(
  action: RecommendationSnapshot['action'],
  returnPct: number
): boolean {
  if (action === 'hold') {
    return Math.abs(returnPct) <= HOLD_WIN_THRESHOLD_PCT
  }

  return returnPct > 0
}

export function getDataQualityFromTiming(targetDate: Date, now = new Date()): 'ok' | 'missing' {
  const graceMs = EVALUATION_GRACE_HOURS * 60 * 60 * 1000
  return now.getTime() - targetDate.getTime() > graceMs ? 'missing' : 'ok'
}
