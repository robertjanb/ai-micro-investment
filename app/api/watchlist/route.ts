import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const addSchema = z.object({
  ideaId: z.string().min(1),
  visitorSessionId: z.string().optional(),
})

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const items = await prisma.watchlistItem.findMany({
      where: { userId: session.user.id },
      include: {
        idea: {
          select: {
            id: true,
            ticker: true,
            companyName: true,
            oneLiner: true,
            riskLevel: true,
            confidenceScore: true,
            signals: true,
            currentPrice: true,
            currency: true,
            priceHistory: {
              orderBy: { timestamp: 'asc' },
              take: 30,
              select: { price: true },
            },
          },
        },
      },
      orderBy: { addedAt: 'desc' },
    })

    const watchlist = items.map((item) => ({
      id: item.id,
      ideaId: item.ideaId,
      ticker: item.idea.ticker,
      companyName: item.idea.companyName,
      oneLiner: item.idea.oneLiner,
      riskLevel: item.idea.riskLevel,
      confidenceScore: item.idea.confidenceScore,
      signals: item.idea.signals,
      addedPrice: item.addedPrice,
      currentPrice: item.idea.currentPrice,
      currency: item.idea.currency,
      changePercent: item.addedPrice > 0
        ? Math.round(
            ((item.idea.currentPrice - item.addedPrice) / item.addedPrice) * 10000
          ) / 100
        : 0,
      changeAbsolute: Math.round((item.idea.currentPrice - item.addedPrice) * 100) / 100,
      priceHistory: item.idea.priceHistory.map((p) => p.price),
      addedAt: item.addedAt,
    }))

    return NextResponse.json({ watchlist })
  } catch (error) {
    console.error('Failed to fetch watchlist:', error)
    return NextResponse.json(
      { error: 'Failed to load watchlist' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = addSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      )
    }

    const { ideaId, visitorSessionId } = parsed.data
    const idea = await prisma.idea.findUnique({
      where: { id: ideaId },
    })

    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
    }

    // Check if already on watchlist
    const existing = await prisma.watchlistItem.findUnique({
      where: {
        userId_ideaId: {
          userId: session.user.id,
          ideaId,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Already on your watchlist' },
        { status: 400 }
      )
    }

    // Check session add count for AC22 nudge
    let nudgeMessage: string | null = null
    if (visitorSessionId) {
      const sessionAddCount = await prisma.watchlistItem.count({
        where: {
          userId: session.user.id,
          visitorSessionId,
        },
      })

      if (sessionAddCount >= 3) {
        nudgeMessage =
          "You're adding several ideas quickly — are you building a watchlist to review later, or would you like to dig deeper into one of these first?"
      }
    }

    const item = await prisma.watchlistItem.create({
      data: {
        userId: session.user.id,
        ideaId,
        addedPrice: idea.currentPrice,
        visitorSessionId,
      },
    })

    return NextResponse.json({ item, nudgeMessage })
  } catch (error) {
    console.error('Failed to add to watchlist:', error)
    return NextResponse.json(
      { error: 'Failed to add to watchlist' },
      { status: 500 }
    )
  }
}
