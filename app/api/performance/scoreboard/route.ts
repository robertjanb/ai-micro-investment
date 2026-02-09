import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isPerformanceProofEnabled, PERFORMANCE_HORIZONS } from '@/lib/performance'
import { ensureMockPerformanceHistory } from '@/lib/mock/performance-history'

const querySchema = z.object({
  horizon: z.coerce.number().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
})

interface Aggregate {
  count: number
  wins: number
  totalReturn: number
  returns: number[]
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

function buildRows(map: Map<string, Aggregate>, fallback = 'unknown') {
  return Array.from(map.entries())
    .map(([key, value]) => ({
      key: key || fallback,
      count: value.count,
      winRate: value.count > 0 ? Math.round((value.wins / value.count) * 10000) / 100 : null,
      avgReturn: value.count > 0 ? Math.round((value.totalReturn / value.count) * 100) / 100 : null,
      medianReturn:
        value.count > 0
          ? Math.round((median(value.returns) ?? 0) * 100) / 100
          : null,
    }))
    .sort((a, b) => {
      if ((b.winRate ?? -1) !== (a.winRate ?? -1)) {
        return (b.winRate ?? -1) - (a.winRate ?? -1)
      }
      if ((b.avgReturn ?? -999) !== (a.avgReturn ?? -999)) {
        return (b.avgReturn ?? -999) - (a.avgReturn ?? -999)
      }
      return b.count - a.count
    })
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
    horizon: searchParams.get('horizon') || undefined,
    from: searchParams.get('from') || undefined,
    to: searchParams.get('to') || undefined,
  })

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
  }

  const horizon = parsed.data.horizon ?? 7
  if (!PERFORMANCE_HORIZONS.includes(horizon as (typeof PERFORMANCE_HORIZONS)[number])) {
    return NextResponse.json({ error: 'Invalid horizon value' }, { status: 400 })
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

  try {
    const evaluations = await prisma.recommendationEvaluation.findMany({
      where: {
        horizonDays: horizon,
        dataQuality: 'ok',
        returnPct: { not: null },
        isWin: { not: null },
        snapshot: snapshotWhere,
      },
      select: {
        returnPct: true,
        isWin: true,
        snapshot: {
          select: {
            action: true,
            riskLevel: true,
            confidenceBucket: true,
          },
        },
      },
    })

    const byAction = new Map<string, Aggregate>()
    const byRiskLevel = new Map<string, Aggregate>()
    const byConfidence = new Map<string, Aggregate>()

    for (const evaluation of evaluations) {
      if (evaluation.returnPct === null || evaluation.isWin === null) {
        continue
      }

      const rows: Array<[Map<string, Aggregate>, string]> = [
        [byAction, evaluation.snapshot.action],
        [byRiskLevel, evaluation.snapshot.riskLevel ?? 'unknown'],
        [byConfidence, evaluation.snapshot.confidenceBucket],
      ]

      for (const [map, key] of rows) {
        const current = map.get(key) ?? {
          count: 0,
          wins: 0,
          totalReturn: 0,
          returns: [],
        }

        current.count += 1
        current.totalReturn += evaluation.returnPct
        if (evaluation.isWin) current.wins += 1
        current.returns.push(evaluation.returnPct)
        map.set(key, current)
      }
    }

    return NextResponse.json({
      horizon,
      totals: {
        evaluated: evaluations.length,
      },
      scoreboards: {
        action: buildRows(byAction),
        riskLevel: buildRows(byRiskLevel),
        confidenceBucket: buildRows(byConfidence),
      },
    })
  } catch (error) {
    console.error('Failed to load performance scoreboard:', error)
    return NextResponse.json({ error: 'Failed to load performance scoreboard' }, { status: 500 })
  }
}
