import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { dateRangeSchema, paginationSchema } from '@/lib/validation'

const historyQuerySchema = z
  .object({
    filter: z.enum(['gains', 'losses']).optional(),
  })
  .merge(paginationSchema)
  .merge(dateRangeSchema)

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const parsed = historyQuerySchema.safeParse({
    page: searchParams.get('page'),
    limit: searchParams.get('limit'),
    filter: searchParams.get('filter') || undefined,
    from: searchParams.get('from') || undefined,
    to: searchParams.get('to') || undefined,
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters' },
      { status: 400 }
    )
  }

  const { page, limit, filter, from, to } = parsed.data

  try {
    const baseConditions: Prisma.Sql[] = []

    if (from) {
      baseConditions.push(Prisma.sql`"generatedDate" >= ${from}`)
    }
    if (to) {
      baseConditions.push(Prisma.sql`"generatedDate" <= ${to}`)
    }

    const filterConditions = [...baseConditions]
    if (filter === 'gains') {
      filterConditions.push(Prisma.sql`"currentPrice" > "initialPrice"`)
    } else if (filter === 'losses') {
      filterConditions.push(Prisma.sql`"currentPrice" <= "initialPrice"`)
    }

    const baseWhere =
      baseConditions.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(baseConditions, ' AND ')}`
        : Prisma.empty

    const filteredWhere =
      filterConditions.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(filterConditions, ' AND ')}`
        : Prisma.empty

    const offset = (page - 1) * limit

    const [rows, totalRows] = await Promise.all([
      prisma.$queryRaw<
        Array<{
          id: string
          ticker: string
          companyName: string
          oneLiner: string
          riskLevel: string
          confidenceScore: number
          signals: unknown
          initialPrice: number
          currentPrice: number
          currency: string
          generatedDate: Date
        }>
      >(Prisma.sql`
        SELECT
          id,
          ticker,
          "companyName",
          "oneLiner",
          "riskLevel",
          "confidenceScore",
          signals,
          "initialPrice",
          "currentPrice",
          currency,
          "generatedDate"
        FROM "Idea"
        ${filteredWhere}
        ORDER BY "generatedDate" DESC
        LIMIT ${limit} OFFSET ${offset}
      `),
      prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
        SELECT COUNT(*)::int AS count
        FROM "Idea"
        ${filteredWhere}
      `),
    ])

    const total = totalRows[0]?.count ?? 0

    // Fetch price history for the returned ideas
    const ideaIds = rows.map((r) => r.id)
    const priceHistoryRows = ideaIds.length > 0
      ? await prisma.priceHistory.findMany({
          where: { ideaId: { in: ideaIds } },
          orderBy: { timestamp: 'asc' },
          select: { ideaId: true, price: true },
        })
      : []

    const priceHistoryMap = new Map<string, number[]>()
    for (const ph of priceHistoryRows) {
      const arr = priceHistoryMap.get(ph.ideaId) ?? []
      arr.push(ph.price)
      priceHistoryMap.set(ph.ideaId, arr)
    }
    // Keep only last 30 entries per idea
    priceHistoryMap.forEach((arr, key) => {
      if (arr.length > 30) priceHistoryMap.set(key, arr.slice(-30))
    })

    const ideas = rows.map((idea) => ({
      id: idea.id,
      ticker: idea.ticker,
      companyName: idea.companyName,
      oneLiner: idea.oneLiner,
      riskLevel: idea.riskLevel,
      confidenceScore: idea.confidenceScore,
      signals: idea.signals,
      initialPrice: idea.initialPrice,
      currentPrice: idea.currentPrice,
      currency: idea.currency,
      changePercent:
        Math.round(
          ((idea.currentPrice - idea.initialPrice) / idea.initialPrice) * 10000
        ) / 100,
      hypotheticalReturn:
        Math.round(
          (10 * (idea.currentPrice / idea.initialPrice) - 10) * 100
        ) / 100,
      priceHistory: priceHistoryMap.get(idea.id) ?? [],
      generatedDate: idea.generatedDate,
    }))

    // Calculate hit rate (ideas older than 7 days where price went up)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const hitConditions = [
      ...baseConditions,
      Prisma.sql`"generatedDate" < ${sevenDaysAgo}`,
    ]

    const hitWhere =
      hitConditions.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(hitConditions, ' AND ')}`
        : Prisma.empty

    const hitRateRows = await prisma.$queryRaw<
      Array<{ wins: number; total: number }>
    >(Prisma.sql`
      SELECT
        COUNT(*) FILTER (WHERE "currentPrice" > "initialPrice")::int AS wins,
        COUNT(*)::int AS total
      FROM "Idea"
      ${hitWhere}
    `)

    const wins = hitRateRows[0]?.wins ?? 0
    const hitTotal = hitRateRows[0]?.total ?? 0
    const hitRate = hitTotal > 0 ? Math.round((wins / hitTotal) * 100) : null

    return NextResponse.json({
      ideas,
      hitRate,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Failed to fetch history:', error)
    return NextResponse.json(
      { error: 'Failed to load history' },
      { status: 500 }
    )
  }
}
