import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
  const filter = searchParams.get('filter') // 'gains' | 'losses' | null
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  try {
    const where: Record<string, unknown> = {}

    if (from || to) {
      where.generatedDate = {}
      if (from) (where.generatedDate as Record<string, unknown>).gte = new Date(from)
      if (to) (where.generatedDate as Record<string, unknown>).lte = new Date(to)
    }

    const allIdeas = await prisma.idea.findMany({
      where,
      orderBy: { generatedDate: 'desc' },
    })

    // Apply gains/losses filter in memory (requires price comparison)
    let filtered = allIdeas
    if (filter === 'gains') {
      filtered = allIdeas.filter((i) => i.currentPrice > i.initialPrice)
    } else if (filter === 'losses') {
      filtered = allIdeas.filter((i) => i.currentPrice <= i.initialPrice)
    }

    const total = filtered.length
    const paginated = filtered.slice((page - 1) * limit, page * limit)

    const ideas = paginated.map((idea) => ({
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
      generatedDate: idea.generatedDate,
    }))

    // Calculate hit rate (ideas older than 7 days where price went up)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const matureIdeas = allIdeas.filter(
      (i) => i.generatedDate < sevenDaysAgo
    )
    const wins = matureIdeas.filter(
      (i) => i.currentPrice > i.initialPrice
    )
    const hitRate =
      matureIdeas.length > 0
        ? Math.round((wins.length / matureIdeas.length) * 100)
        : null

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
