import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isPerformanceProofEnabled, PERFORMANCE_HORIZONS } from '@/lib/performance'
import { ensureMockPerformanceHistory } from '@/lib/mock/performance-history'

const querySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
})

function median(values: number[]): number | null {
  if (values.length === 0) return null

  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }

  return sorted[mid]
}

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isPerformanceProofEnabled()) {
    return NextResponse.json({ error: 'Performance proof is disabled' }, { status: 503 })
  }

  await ensureMockPerformanceHistory(session.user.id)

  const { searchParams } = new URL(req.url)
  const parsed = querySchema.safeParse({
    from: searchParams.get('from') || undefined,
    to: searchParams.get('to') || undefined,
  })

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
  }

  const { from, to } = parsed.data
  const dateFilter = from || to
    ? {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      }
    : undefined

  const snapshotWhere = {
    userId: session.user.id,
    ...(dateFilter ? { generatedDate: dateFilter } : {}),
  }

  const evaluationWhere = {
    snapshot: snapshotWhere,
    horizonDays: { in: [...PERFORMANCE_HORIZONS] },
  }

  try {
    const [snapshotTotal, pendingCount, scoredCount, staleCount, evaluations] = await Promise.all([
      prisma.recommendationSnapshot.count({ where: snapshotWhere }),
      prisma.recommendationSnapshot.count({ where: { ...snapshotWhere, status: 'pending' } }),
      prisma.recommendationSnapshot.count({ where: { ...snapshotWhere, status: 'scored' } }),
      prisma.recommendationSnapshot.count({ where: { ...snapshotWhere, status: 'stale' } }),
      prisma.recommendationEvaluation.findMany({
        where: evaluationWhere,
        select: {
          horizonDays: true,
          returnPct: true,
          isWin: true,
          dataQuality: true,
          snapshot: {
            select: {
              confidenceBucket: true,
            },
          },
        },
      }),
    ])

    const horizonStats = new Map<number, { returns: number[]; wins: number; total: number }>()
    for (const horizon of PERFORMANCE_HORIZONS) {
      horizonStats.set(horizon, { returns: [], wins: 0, total: 0 })
    }

    const calibrationStats = new Map<string, { count: number; wins: number; totalReturn: number }>()
    const dataQuality = {
      ok: 0,
      stale: 0,
      missing: 0,
    }

    for (const evaluation of evaluations) {
      if (evaluation.dataQuality === 'ok') {
        dataQuality.ok += 1
      } else if (evaluation.dataQuality === 'missing') {
        dataQuality.missing += 1
      } else {
        dataQuality.stale += 1
      }

      if (
        evaluation.dataQuality === 'ok' &&
        evaluation.returnPct !== null &&
        evaluation.isWin !== null
      ) {
        const horizon = horizonStats.get(evaluation.horizonDays)
        if (horizon) {
          horizon.total += 1
          if (evaluation.isWin) horizon.wins += 1
          horizon.returns.push(evaluation.returnPct)
        }

        if (evaluation.horizonDays === 7) {
          const current = calibrationStats.get(evaluation.snapshot.confidenceBucket) ?? {
            count: 0,
            wins: 0,
            totalReturn: 0,
          }
          current.count += 1
          current.totalReturn += evaluation.returnPct
          if (evaluation.isWin) current.wins += 1
          calibrationStats.set(evaluation.snapshot.confidenceBucket, current)
        }
      }
    }

    const horizons = PERFORMANCE_HORIZONS.reduce<Record<string, {
      count: number
      winRate: number | null
      avgReturn: number | null
      medianReturn: number | null
    }>>((acc, horizon) => {
      const stats = horizonStats.get(horizon)
      const total = stats?.total ?? 0
      const sum = (stats?.returns ?? []).reduce((s, value) => s + value, 0)

      acc[horizon.toString()] = {
        count: total,
        winRate: total > 0 ? Math.round(((stats?.wins ?? 0) / total) * 10000) / 100 : null,
        avgReturn: total > 0 ? Math.round((sum / total) * 100) / 100 : null,
        medianReturn: total > 0 ? Math.round((median(stats?.returns ?? []) ?? 0) * 100) / 100 : null,
      }

      return acc
    }, {})

    const calibration = Array.from(calibrationStats.entries())
      .sort((a, b) => Number(a[0].split('-')[0]) - Number(b[0].split('-')[0]))
      .map(([bucket, stats]) => ({
        bucket,
        count: stats.count,
        winRate: stats.count > 0 ? Math.round((stats.wins / stats.count) * 10000) / 100 : null,
        avgReturn: stats.count > 0 ? Math.round((stats.totalReturn / stats.count) * 100) / 100 : null,
      }))

    return NextResponse.json({
      totals: {
        snapshots: snapshotTotal,
        evaluated: scoredCount + staleCount,
        pending: pendingCount,
        scored: scoredCount,
        stale: staleCount,
      },
      horizons,
      calibration,
      dataQuality,
    })
  } catch (error) {
    console.error('Failed to load performance overview:', error)
    return NextResponse.json({ error: 'Failed to load performance overview' }, { status: 500 })
  }
}
