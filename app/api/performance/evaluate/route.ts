import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPriceProvider } from '@/lib/data-sources'
import type { PricePoint } from '@/lib/data-sources/types'
import {
  PERFORMANCE_HORIZONS,
  addDays,
  calculateReturnPct,
  getConfidenceBucket,
  getDataQualityFromTiming,
  isPerformanceProofEnabled,
  isWinningOutcome,
} from '@/lib/performance'
import { ensureMockPerformanceHistory } from '@/lib/mock/performance-history'

const CRON_JOB_NAME = 'performance-evaluation'

type DataQuality = 'ok' | 'missing'

export async function POST(req: Request) {
  if (!isPerformanceProofEnabled()) {
    return NextResponse.json({ error: 'Performance proof is disabled' }, { status: 503 })
  }

  const session = await getSession()
  const { searchParams } = new URL(req.url)
  const cronSecret = searchParams.get('secret') || req.headers.get('x-cron-secret')
  const isValidCron = Boolean(cronSecret && process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET)
  const shouldRecordCron = Boolean(isValidCron && !session)

  if (!session && !isValidCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    if (session) {
      await ensureMockPerformanceHistory(session.user.id)
    }

    const userIds = session
      ? [session.user.id]
      : (await prisma.user.findMany({ select: { id: true } })).map((user) => user.id)

    // Backfill: create snapshots for any recommendations that don't have them
    const priceProvider = getPriceProvider()
    for (const userId of userIds) {
      await backfillMissingSnapshots(userId, priceProvider)
    }

    const summary = {
      usersProcessed: userIds.length,
      snapshotsChecked: 0,
      evaluationsRecorded: 0,
      missingMarked: 0,
      pendingSnapshots: 0,
      scoredSnapshots: 0,
      staleSnapshots: 0,
    }

    const historyCache = new Map<string, PricePoint[]>()

    for (const userId of userIds) {
      const result = await evaluateUserSnapshots(userId, priceProvider, historyCache)
      summary.snapshotsChecked += result.snapshotsChecked
      summary.evaluationsRecorded += result.evaluationsRecorded
      summary.missingMarked += result.missingMarked
      summary.pendingSnapshots += result.pendingSnapshots
      summary.scoredSnapshots += result.scoredSnapshots
      summary.staleSnapshots += result.staleSnapshots
    }

    if (shouldRecordCron) {
      await recordCronStatus({ success: true, summary })
    }

    return NextResponse.json({ success: true, ...summary })
  } catch (error) {
    console.error('Performance evaluation failed:', error)

    if (shouldRecordCron) {
      await recordCronStatus({
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    return NextResponse.json({ error: 'Failed to evaluate recommendation outcomes' }, { status: 500 })
  }
}

async function evaluateUserSnapshots(
  userId: string,
  priceProvider: ReturnType<typeof getPriceProvider>,
  historyCache: Map<string, PricePoint[]>
) {
  const snapshots = await prisma.recommendationSnapshot.findMany({
    where: {
      userId,
      status: { in: ['pending', 'stale'] },
    },
    include: {
      evaluations: true,
    },
    orderBy: { generatedAt: 'asc' },
  })

  const now = new Date()
  let evaluationsRecorded = 0
  let missingMarked = 0
  let pendingSnapshots = 0
  let scoredSnapshots = 0
  let staleSnapshots = 0

  for (const snapshot of snapshots) {
    const evaluationMap = new Map(snapshot.evaluations.map((evaluation) => [evaluation.horizonDays, evaluation]))

    for (const horizon of PERFORMANCE_HORIZONS) {
      const targetDate = addDays(snapshot.generatedDate, horizon)
      if (now < targetDate) {
        continue
      }

      const existing = evaluationMap.get(horizon)
      if (existing?.dataQuality === 'ok' && existing.returnPct !== null) {
        continue
      }

      const exitPrice = await resolveExitPrice(snapshot.ticker, targetDate, priceProvider, historyCache)

      if (exitPrice !== null) {
        const returnPct = calculateReturnPct(snapshot.action, snapshot.entryPrice, exitPrice)
        const isWin = isWinningOutcome(snapshot.action, returnPct)

        if (existing) {
          await prisma.recommendationEvaluation.update({
            where: { id: existing.id },
            data: {
              targetDate,
              evaluatedAt: now,
              exitPrice,
              returnPct,
              isWin,
              dataQuality: 'ok',
            },
          })
          evaluationMap.set(horizon, { ...existing, dataQuality: 'ok', returnPct, isWin, exitPrice })
        } else {
          const created = await prisma.recommendationEvaluation.upsert({
            where: {
              snapshotId_horizonDays: { snapshotId: snapshot.id, horizonDays: horizon },
            },
            update: {
              targetDate,
              evaluatedAt: now,
              exitPrice,
              returnPct,
              isWin,
              dataQuality: 'ok',
            },
            create: {
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
          evaluationMap.set(horizon, created)
        }

        evaluationsRecorded += 1
        continue
      }

      const quality: DataQuality = getDataQualityFromTiming(targetDate, now)
      if (quality === 'ok') {
        continue
      }

      if (existing) {
        if (existing.dataQuality !== 'missing') {
          await prisma.recommendationEvaluation.update({
            where: { id: existing.id },
            data: {
              targetDate,
              evaluatedAt: now,
              exitPrice: null,
              returnPct: null,
              isWin: null,
              dataQuality: 'missing',
            },
          })
          evaluationMap.set(horizon, { ...existing, dataQuality: 'missing', returnPct: null, isWin: null, exitPrice: null })
          missingMarked += 1
        }
      } else {
        const created = await prisma.recommendationEvaluation.upsert({
          where: {
            snapshotId_horizonDays: { snapshotId: snapshot.id, horizonDays: horizon },
          },
          update: {
            targetDate,
            evaluatedAt: now,
            exitPrice: null,
            returnPct: null,
            isWin: null,
            dataQuality: 'missing',
          },
          create: {
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
        evaluationMap.set(horizon, created)
        missingMarked += 1
      }
    }

    const horizonEvaluations = PERFORMANCE_HORIZONS.map((horizon) => evaluationMap.get(horizon))
    const allEvaluated = horizonEvaluations.every(Boolean)
    const hasMissing = horizonEvaluations.some((evaluation) => evaluation?.dataQuality !== 'ok')

    const nextStatus = allEvaluated ? (hasMissing ? 'stale' : 'scored') : 'pending'

    if (snapshot.status !== nextStatus) {
      await prisma.recommendationSnapshot.update({
        where: { id: snapshot.id },
        data: { status: nextStatus },
      })
    }

    if (nextStatus === 'pending') pendingSnapshots += 1
    if (nextStatus === 'scored') scoredSnapshots += 1
    if (nextStatus === 'stale') staleSnapshots += 1
  }

  return {
    snapshotsChecked: snapshots.length,
    evaluationsRecorded,
    missingMarked,
    pendingSnapshots,
    scoredSnapshots,
    staleSnapshots,
  }
}

async function resolveExitPrice(
  ticker: string,
  targetDate: Date,
  priceProvider: ReturnType<typeof getPriceProvider>,
  historyCache: Map<string, PricePoint[]>
): Promise<number | null> {
  if (!historyCache.has(ticker)) {
    const history = await priceProvider.getPriceHistory(ticker, 180)
    history.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    historyCache.set(ticker, history)
  }

  const history = historyCache.get(ticker) ?? []
  const afterOrOnTarget = history.find((point) => point.timestamp.getTime() >= targetDate.getTime())

  return afterOrOnTarget?.price ?? null
}

async function backfillMissingSnapshots(
  userId: string,
  priceProvider: ReturnType<typeof getPriceProvider>
) {
  // Find recommendations that have no corresponding snapshot
  const recommendations = await prisma.recommendation.findMany({
    where: {
      userId,
      snapshots: { none: {} },
    },
    select: {
      id: true,
      ticker: true,
      action: true,
      confidence: true,
      holdingId: true,
      generatedAt: true,
      createdAt: true,
    },
  })

  if (recommendations.length === 0) return

  // Get holdings and ideas for context
  const [holdings, ideas] = await Promise.all([
    prisma.holding.findMany({
      where: { userId },
      select: {
        id: true,
        ideaId: true,
        ticker: true,
        currentPrice: true,
      },
    }),
    prisma.idea.findMany({
      select: {
        id: true,
        ticker: true,
        riskLevel: true,
        currentPrice: true,
        currency: true,
      },
      orderBy: { generatedDate: 'desc' },
      take: 100,
    }),
  ])

  const holdingByTicker = new Map(holdings.map((h) => [h.ticker, h]))
  const ideaByTicker = new Map(ideas.map((i) => [i.ticker, i]))
  const validIdeaIds = new Set(ideas.map((i) => i.id))

  for (const rec of recommendations) {
    const holding = holdingByTicker.get(rec.ticker)
    const idea = ideaByTicker.get(rec.ticker)

    let entryPrice = holding?.currentPrice ?? idea?.currentPrice ?? null

    if (!entryPrice || entryPrice <= 0) {
      try {
        const fetched = await priceProvider.getCurrentPrice(rec.ticker)
        entryPrice = fetched > 0 ? fetched : null
      } catch {
        entryPrice = null
      }
    }

    if (!entryPrice || entryPrice <= 0) continue

    // Only use ideaId if it still exists (holdings may reference deleted ideas)
    const ideaId = idea?.id ?? (holding?.ideaId && validIdeaIds.has(holding.ideaId) ? holding.ideaId : null)

    await prisma.recommendationSnapshot.create({
      data: {
        userId,
        recommendationId: rec.id,
        holdingId: rec.holdingId ?? holding?.id ?? null,
        ideaId,
        ticker: rec.ticker,
        action: rec.action,
        confidence: rec.confidence,
        confidenceBucket: getConfidenceBucket(rec.confidence),
        generatedAt: rec.createdAt,
        generatedDate: rec.generatedAt,
        entryPrice,
        currency: idea?.currency ?? 'EUR',
        riskLevel: idea?.riskLevel ?? null,
      },
    })
  }
}

async function recordCronStatus({
  success,
  summary,
  errorMessage,
}: {
  success: boolean
  summary?: Record<string, unknown>
  errorMessage?: string
}) {
  try {
    const now = new Date()
    await prisma.cronJobStatus.upsert({
      where: { name: CRON_JOB_NAME },
      update: {
        lastRunAt: now,
        lastSuccessAt: success ? now : undefined,
        lastError: success ? null : errorMessage || 'Unknown error',
        lastSummary: (summary as Prisma.InputJsonValue) ?? undefined,
      },
      create: {
        name: CRON_JOB_NAME,
        lastRunAt: now,
        lastSuccessAt: success ? now : null,
        lastError: success ? null : errorMessage || 'Unknown error',
        lastSummary: (summary as Prisma.InputJsonValue) ?? undefined,
      },
    })
  } catch (error) {
    console.error('Failed to record performance cron status:', error)
  }
}
