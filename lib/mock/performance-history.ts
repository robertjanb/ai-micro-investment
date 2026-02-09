import { prisma } from '@/lib/prisma'
import {
  PERFORMANCE_HORIZONS,
  addDays,
  calculateReturnPct,
  getConfidenceBucket,
  getDataQualityFromTiming,
  isWinningOutcome,
  normalizeDate,
} from '@/lib/performance'

const FALLBACK_TICKERS = [
  { ticker: 'NRDZ', price: 42.3, currency: 'EUR', riskLevel: 'interesting' },
  { ticker: 'SLRQ', price: 28.5, currency: 'EUR', riskLevel: 'interesting' },
  { ticker: 'FRML', price: 15.8, currency: 'EUR', riskLevel: 'safe' },
  { ticker: 'CRTX', price: 89.2, currency: 'EUR', riskLevel: 'spicy' },
  { ticker: 'TMLK', price: 34.6, currency: 'EUR', riskLevel: 'interesting' },
]

const BACKFILL_DAY_OFFSETS = [1, 2, 3, 5, 7, 10, 14, 18, 22, 26, 30, 34, 38, 45]

export interface EnsureMockPerformanceOptions {
  force?: boolean
  minSnapshots?: number
}

function deterministicUnit(input: string): number {
  let hash = 2166136261
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }

  return ((hash >>> 0) % 10000) / 10000
}

function pickAction(seed: string): 'buy' | 'sell' | 'hold' {
  const value = deterministicUnit(`${seed}:action`)
  if (value < 0.34) return 'buy'
  if (value < 0.67) return 'sell'
  return 'hold'
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function getSyntheticReturnPct(
  seed: string,
  action: 'buy' | 'sell' | 'hold',
  confidence: number,
  horizon: number
): number {
  const unit = deterministicUnit(`${seed}:return:${horizon}`)
  const horizonScale = horizon === 1 ? 0.55 : horizon === 7 ? 1 : 1.25

  if (action === 'hold') {
    return Math.round(((unit - 0.5) * 4.5 * horizonScale) * 100) / 100
  }

  const baseMove = (unit - 0.5) * 16 * horizonScale
  const confidenceBias = (confidence - 70) * 0.08

  const directional = action === 'buy'
    ? baseMove + confidenceBias
    : -baseMove + confidenceBias * 0.4

  return Math.round(clamp(directional, -20, 20) * 100) / 100
}

export async function ensureMockPerformanceHistory(
  userId: string,
  options: EnsureMockPerformanceOptions = {}
): Promise<void> {
  if (process.env.DATA_SOURCE !== 'mock') {
    return
  }

  if (options.force) {
    await prisma.recommendationEvaluation.deleteMany({
      where: {
        snapshot: { userId },
      },
    })

    await prisma.recommendationSnapshot.deleteMany({
      where: { userId },
    })
  }

  const currentCount = await prisma.recommendationSnapshot.count({
    where: { userId },
  })

  const minSnapshots = options.minSnapshots ?? 25
  if (currentCount >= minSnapshots) {
    return
  }

  const [holdings, ideas] = await Promise.all([
    prisma.holding.findMany({
      where: { userId },
      select: {
        ticker: true,
        currentPrice: true,
        idea: {
          select: {
            currency: true,
            riskLevel: true,
          },
        },
      },
      take: 20,
    }),
    prisma.idea.findMany({
      where: {
        generatedDate: { gte: addDays(normalizeDate(), -60) },
      },
      select: {
        id: true,
        ticker: true,
        currentPrice: true,
        currency: true,
        riskLevel: true,
      },
      orderBy: { generatedDate: 'desc' },
      take: 40,
    }),
  ])

  const tickerPool = new Map<
    string,
    {
      ideaId: string | null
      entryBase: number
      currency: string
      riskLevel: string | null
    }
  >()

  for (const holding of holdings) {
    tickerPool.set(holding.ticker, {
      ideaId: null,
      entryBase: holding.currentPrice > 0 ? holding.currentPrice : 20,
      currency: holding.idea?.currency ?? 'EUR',
      riskLevel: holding.idea?.riskLevel ?? null,
    })
  }

  for (const idea of ideas) {
    if (!tickerPool.has(idea.ticker)) {
      tickerPool.set(idea.ticker, {
        ideaId: idea.id,
        entryBase: idea.currentPrice > 0 ? idea.currentPrice : 20,
        currency: idea.currency,
        riskLevel: idea.riskLevel,
      })
    }
  }

  for (const fallback of FALLBACK_TICKERS) {
    if (!tickerPool.has(fallback.ticker)) {
      tickerPool.set(fallback.ticker, {
        ideaId: null,
        entryBase: fallback.price,
        currency: fallback.currency,
        riskLevel: fallback.riskLevel,
      })
    }
  }

  const tickers = Array.from(tickerPool.entries())
  if (tickers.length === 0) {
    return
  }

  const now = new Date()

  for (const dayOffset of BACKFILL_DAY_OFFSETS) {
    const generatedDate = normalizeDate(addDays(now, -dayOffset))

    for (let idx = 0; idx < Math.min(3, tickers.length); idx++) {
      const [ticker, base] = tickers[(dayOffset + idx) % tickers.length]
      const seed = `${userId}:${ticker}:${generatedDate.toISOString()}:${idx}`

      const action = pickAction(seed)
      const confidence = 55 + Math.floor(deterministicUnit(`${seed}:confidence`) * 36)
      const entryFactor = 0.85 + deterministicUnit(`${seed}:entry`) * 0.3
      const entryPrice = Math.round(base.entryBase * entryFactor * 100) / 100

      const snapshot = await prisma.recommendationSnapshot.create({
        data: {
          userId,
          recommendationId: null,
          holdingId: null,
          ideaId: base.ideaId,
          ticker,
          action,
          confidence,
          confidenceBucket: getConfidenceBucket(confidence),
          generatedAt: generatedDate,
          generatedDate,
          entryPrice,
          currency: base.currency,
          riskLevel: base.riskLevel,
          status: 'pending',
        },
      })

      let hasMissing = false
      let completedHorizons = 0

      for (const horizon of PERFORMANCE_HORIZONS) {
        const targetDate = addDays(generatedDate, horizon)
        if (now < targetDate) {
          continue
        }

        const syntheticMissing = deterministicUnit(`${seed}:missing:${horizon}`) < 0.08
        const canBeMissing = getDataQualityFromTiming(targetDate, now) === 'missing'
        const quality = syntheticMissing && canBeMissing ? 'missing' : 'ok'

        if (quality === 'missing') {
          hasMissing = true
          completedHorizons += 1

          await prisma.recommendationEvaluation.create({
            data: {
              snapshotId: snapshot.id,
              horizonDays: horizon,
              targetDate,
              evaluatedAt: now,
              exitPrice: null,
              returnPct: null,
              isWin: null,
              dataQuality: 'missing',
            },
          })

          continue
        }

        const returnPct = getSyntheticReturnPct(seed, action, confidence, horizon)
        const exitPrice = Math.round(entryPrice * (1 + returnPct / 100) * 100) / 100
        const isWin = isWinningOutcome(action, calculateReturnPct(action, entryPrice, exitPrice))

        completedHorizons += 1

        await prisma.recommendationEvaluation.create({
          data: {
            snapshotId: snapshot.id,
            horizonDays: horizon,
            targetDate,
            evaluatedAt: now,
            exitPrice,
            returnPct,
            isWin,
            dataQuality: 'ok',
          },
        })
      }

      const status =
        completedHorizons === PERFORMANCE_HORIZONS.length
          ? hasMissing
            ? 'stale'
            : 'scored'
          : 'pending'

      await prisma.recommendationSnapshot.update({
        where: { id: snapshot.id },
        data: { status },
      })
    }
  }
}
