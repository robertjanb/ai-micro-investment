import { NextResponse } from 'next/server'
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

    // Check if we already have ideas for today
    let ideas = await prisma.idea.findMany({
      where: {
        generatedDate: today,
      },
      orderBy: { confidenceScore: 'desc' },
    })

    // Generate new ideas if none exist for today
    if (ideas.length === 0) {
      const ideaProvider = getIdeaProvider()
      const generatedIdeas = await ideaProvider.generateDailyIdeas(
        3 + Math.floor(Math.random() * 3) // 3-5 ideas
      )

      // Re-check to prevent race condition (another request may have inserted)
      const recheck = await prisma.idea.count({ where: { generatedDate: today } })
      if (recheck > 0) {
        ideas = await prisma.idea.findMany({
          where: { generatedDate: today },
          orderBy: { confidenceScore: 'desc' },
        })
      } else {
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
