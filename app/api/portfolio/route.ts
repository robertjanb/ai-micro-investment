import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const addHoldingSchema = z.object({
  ideaId: z.string().optional(),
  ticker: z.string().min(1).max(10),
  companyName: z.string().optional(),
  quantity: z.number().positive(),
  purchasePrice: z.number().positive(),
  purchaseDate: z.string(),
  notes: z.string().optional(),
})

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const holdings = await prisma.holding.findMany({
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
            currency: true,
          },
        },
      },
      orderBy: { purchaseDate: 'desc' },
    })

    const portfolio = holdings.map((holding) => {
      const gainLoss = (holding.currentPrice - holding.purchasePrice) * holding.quantity
      const gainLossPercent =
        holding.purchasePrice > 0
          ? ((holding.currentPrice - holding.purchasePrice) / holding.purchasePrice) * 100
          : 0

      return {
        id: holding.id,
        ideaId: holding.ideaId,
        ticker: holding.ticker,
        companyName: holding.companyName || holding.idea?.companyName || null,
        quantity: holding.quantity,
        purchasePrice: holding.purchasePrice,
        currentPrice: holding.currentPrice,
        purchaseDate: holding.purchaseDate,
        notes: holding.notes,
        gainLoss: Math.round(gainLoss * 100) / 100,
        gainLossPercent: Math.round(gainLossPercent * 100) / 100,
        idea: holding.idea,
        createdAt: holding.createdAt,
      }
    })

    // Calculate summary
    const totalValue = portfolio.reduce((sum, h) => sum + h.quantity * h.currentPrice, 0)
    const totalCost = portfolio.reduce((sum, h) => sum + h.quantity * h.purchasePrice, 0)
    const totalGainLoss = totalValue - totalCost
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0

    return NextResponse.json({
      holdings: portfolio,
      summary: {
        totalValue: Math.round(totalValue * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        totalGainLoss: Math.round(totalGainLoss * 100) / 100,
        totalGainLossPercent: Math.round(totalGainLossPercent * 100) / 100,
        holdingCount: portfolio.length,
      },
    })
  } catch (error) {
    console.error('Failed to fetch portfolio:', error)
    return NextResponse.json({ error: 'Failed to load portfolio' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = addHoldingSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const { ideaId, ticker, companyName, quantity, purchasePrice, purchaseDate, notes } = parsed.data
    const parsedDate = new Date(purchaseDate)
    parsedDate.setHours(0, 0, 0, 0)

    // If ideaId provided, validate it exists
    let idea = null
    if (ideaId) {
      idea = await prisma.idea.findUnique({ where: { id: ideaId } })
      if (!idea) {
        return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
      }
    }

    // Check for duplicate (same user, ticker, purchase date)
    const existing = await prisma.holding.findUnique({
      where: {
        userId_ticker_purchaseDate: {
          userId: session.user.id,
          ticker: ticker.toUpperCase(),
          purchaseDate: parsedDate,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'You already have a holding for this ticker on this date' },
        { status: 400 }
      )
    }

    // Use idea's current price if from idea, otherwise use provided purchase price
    const currentPrice = idea ? idea.currentPrice : purchasePrice

    const holding = await prisma.holding.create({
      data: {
        userId: session.user.id,
        ideaId: ideaId || null,
        ticker: ticker.toUpperCase(),
        companyName: companyName || idea?.companyName || null,
        quantity,
        purchasePrice,
        purchaseDate: parsedDate,
        currentPrice,
        notes: notes || null,
      },
    })

    return NextResponse.json({ holding })
  } catch (error) {
    console.error('Failed to add holding:', error)
    return NextResponse.json({ error: 'Failed to add holding' }, { status: 500 })
  }
}
