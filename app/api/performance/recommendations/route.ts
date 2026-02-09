import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { dateRangeSchema, paginationSchema } from '@/lib/validation'
import { isPerformanceProofEnabled, PERFORMANCE_HORIZONS } from '@/lib/performance'
import { ensureMockPerformanceHistory } from '@/lib/mock/performance-history'

const querySchema = z
  .object({
    ticker: z.string().min(1).max(12).optional(),
    action: z.enum(['buy', 'sell', 'hold']).optional(),
    horizon: z.coerce.number().optional(),
    result: z.enum(['win', 'loss', 'pending']).optional(),
  })
  .merge(paginationSchema)
  .merge(dateRangeSchema)

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
    page: searchParams.get('page'),
    limit: searchParams.get('limit'),
    ticker: searchParams.get('ticker') || undefined,
    action: searchParams.get('action') || undefined,
    horizon: searchParams.get('horizon') || undefined,
    result: searchParams.get('result') || undefined,
    from: searchParams.get('from') || undefined,
    to: searchParams.get('to') || undefined,
  })

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 })
  }

  const { page, limit, ticker, action, result, from, to } = parsed.data
  const horizon = parsed.data.horizon ?? 7

  if (!PERFORMANCE_HORIZONS.includes(horizon as (typeof PERFORMANCE_HORIZONS)[number])) {
    return NextResponse.json({ error: 'Invalid horizon value' }, { status: 400 })
  }

  const where: Prisma.RecommendationSnapshotWhereInput = {
    userId: session.user.id,
  }

  if (ticker) {
    where.ticker = { contains: ticker.toUpperCase() }
  }

  if (action) {
    where.action = action
  }

  if (from || to) {
    where.generatedDate = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    }
  }

  if (result === 'win') {
    where.evaluations = {
      some: {
        horizonDays: horizon,
        dataQuality: 'ok',
        isWin: true,
      },
    }
  } else if (result === 'loss') {
    where.evaluations = {
      some: {
        horizonDays: horizon,
        dataQuality: 'ok',
        isWin: false,
      },
    }
  } else if (result === 'pending') {
    where.OR = [
      {
        evaluations: {
          none: {
            horizonDays: horizon,
          },
        },
      },
      {
        evaluations: {
          some: {
            horizonDays: horizon,
            OR: [{ isWin: null }, { dataQuality: { not: 'ok' } }],
          },
        },
      },
    ]
  }

  try {
    const [total, snapshots] = await Promise.all([
      prisma.recommendationSnapshot.count({ where }),
      prisma.recommendationSnapshot.findMany({
        where,
        orderBy: [{ generatedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          evaluations: {
            where: {
              horizonDays: { in: [...PERFORMANCE_HORIZONS] },
            },
            orderBy: { horizonDays: 'asc' },
          },
        },
      }),
    ])

    return NextResponse.json({
      recommendations: snapshots.map((snapshot) => {
        const evaluationMap = Object.fromEntries(
          snapshot.evaluations.map((evaluation) => [
            evaluation.horizonDays,
            {
              horizonDays: evaluation.horizonDays,
              targetDate: evaluation.targetDate,
              evaluatedAt: evaluation.evaluatedAt,
              exitPrice: evaluation.exitPrice,
              returnPct: evaluation.returnPct,
              isWin: evaluation.isWin,
              dataQuality: evaluation.dataQuality,
            },
          ])
        )

        return {
          id: snapshot.id,
          ticker: snapshot.ticker,
          action: snapshot.action,
          confidence: snapshot.confidence,
          confidenceBucket: snapshot.confidenceBucket,
          entryPrice: snapshot.entryPrice,
          currency: snapshot.currency,
          riskLevel: snapshot.riskLevel,
          status: snapshot.status,
          generatedAt: snapshot.generatedAt,
          generatedDate: snapshot.generatedDate,
          evaluations: evaluationMap,
        }
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Failed to load performance recommendations:', error)
    return NextResponse.json({ error: 'Failed to load recommendation outcomes' }, { status: 500 })
  }
}
