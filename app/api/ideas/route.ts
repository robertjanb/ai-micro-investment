import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getIdeaProvider, getPriceProvider } from '@/lib/data-sources'
import { checkRateLimit, IDEAS_RATE_LIMIT } from '@/lib/rate-limit'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rateCheck = checkRateLimit(`ideas:${session.user.id}`, IDEAS_RATE_LIMIT)
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment.' },
      { status: 429 }
    )
  }

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let batchCreated = false
    try {
      await prisma.dailyIdeaBatch.create({
        data: { generatedDate: today },
      })
      batchCreated = true
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        batchCreated = false
      } else {
        throw error
      }
    }

    // Check if we already have ideas for today
    let ideas = await prisma.idea.findMany({
      where: { generatedDate: today },
      orderBy: { confidenceScore: 'desc' },
    })

    // Generate new ideas if none exist for today
    if (ideas.length === 0 && batchCreated) {
      try {
        const ideaProvider = getIdeaProvider()
        const generatedIdeas = await ideaProvider.generateDailyIdeas(
          3 + Math.floor(Math.random() * 3) // 3-5 ideas
        )

        ideas = await Promise.all(
          generatedIdeas.map((idea) =>
            prisma.idea.create({
              data: {
                ticker: idea.ticker,
                companyName: idea.companyName,
                oneLiner: idea.oneLiner,
                thesis: idea.thesis,
                bearCase: idea.bearCase,
                confidenceScore: idea.confidenceScore,
                signals: idea.signals as unknown as Record<string, boolean>,
                riskLevel: idea.riskLevel,
                initialPrice: idea.initialPrice,
                currentPrice: idea.initialPrice,
                currency: idea.currency,
                generatedDate: today,
              },
            })
          )
        )

        // Create initial price history entries
        await Promise.all(
          ideas.map((idea) =>
            prisma.priceHistory.create({
              data: {
                ideaId: idea.id,
                price: idea.initialPrice,
              },
            })
          )
        )
      } catch (error) {
        await prisma.dailyIdeaBatch.delete({
          where: { generatedDate: today },
        })
        throw error
      }
    } else if (ideas.length === 0) {
      for (let attempt = 0; attempt < 3 && ideas.length === 0; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 200))
        ideas = await prisma.idea.findMany({
          where: { generatedDate: today },
          orderBy: { confidenceScore: 'desc' },
        })
      }
    } else {
      // Update prices for existing ideas
      const priceProvider = getPriceProvider()
      const tickers = ideas.map((i) => i.ticker)
      await priceProvider.updatePrices(tickers)

      // Refresh ideas with updated prices
      ideas = await prisma.idea.findMany({
        where: { generatedDate: today },
        orderBy: { confidenceScore: 'desc' },
      })
    }

    return NextResponse.json({ ideas })
  } catch (error) {
    console.error('Failed to fetch ideas:', error)
    return NextResponse.json(
      { error: 'Failed to load investment ideas' },
      { status: 500 }
    )
  }
}
