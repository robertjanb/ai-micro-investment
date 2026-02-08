import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getRecommendationProvider } from '@/lib/data-sources'
import type { HoldingData, Signals } from '@/lib/data-sources/types'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const force = request.nextUrl.searchParams.get('force') === 'true'

  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // If force-refresh, delete existing recommendations for today
    if (force) {
      await prisma.recommendation.deleteMany({
        where: {
          userId: session.user.id,
          generatedAt: today,
        },
      })
    } else {
      // Check for existing recommendations for today
      const existingRecommendations = await prisma.recommendation.findMany({
        where: {
          userId: session.user.id,
          generatedAt: today,
        },
        include: {
          holding: {
            select: {
              id: true,
              ticker: true,
              companyName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      if (existingRecommendations.length > 0) {
        return NextResponse.json({
          recommendations: existingRecommendations.map((r) => ({
            id: r.id,
            ticker: r.ticker,
            action: r.action,
            reasoning: r.reasoning,
            confidence: r.confidence,
            holdingId: r.holdingId,
            holding: r.holding,
            generatedAt: r.generatedAt,
          })),
          generatedAt: existingRecommendations[0].createdAt,
          cached: true,
        })
      }
    }

    // Fetch user's holdings
    const holdings = await prisma.holding.findMany({
      where: { userId: session.user.id },
    })

    // Fetch today's ideas
    const todaysIdeas = await prisma.idea.findMany({
      where: { generatedDate: today },
      select: {
        id: true,
        ticker: true,
        companyName: true,
        signals: true,
        confidenceScore: true,
      },
    })

    // Convert holdings to provider format
    const holdingData: HoldingData[] = holdings.map((h) => ({
      id: h.id,
      ticker: h.ticker,
      companyName: h.companyName,
      quantity: h.quantity,
      purchasePrice: h.purchasePrice,
      currentPrice: h.currentPrice,
      purchaseDate: h.purchaseDate,
      gainLoss: (h.currentPrice - h.purchasePrice) * h.quantity,
      gainLossPercent:
        h.purchasePrice > 0
          ? ((h.currentPrice - h.purchasePrice) / h.purchasePrice) * 100
          : 0,
    }))

    // Convert ideas to provider format
    const ideaData = todaysIdeas.map((i) => ({
      ticker: i.ticker,
      companyName: i.companyName,
      signals: i.signals as unknown as Signals,
      confidenceScore: i.confidenceScore,
    }))

    // Generate recommendations
    const provider = getRecommendationProvider()
    const recommendations = await provider.generateRecommendations(holdingData, ideaData)

    // Store recommendations in database
    const storedRecommendations = await Promise.all(
      recommendations.map(async (rec) => {
        const holding = holdings.find((h) => h.ticker === rec.ticker)
        return prisma.recommendation.create({
          data: {
            userId: session.user.id,
            holdingId: holding?.id || null,
            ticker: rec.ticker,
            action: rec.action,
            reasoning: rec.reasoning,
            confidence: rec.confidence,
            generatedAt: today,
          },
          include: {
            holding: {
              select: {
                id: true,
                ticker: true,
                companyName: true,
              },
            },
          },
        })
      })
    )

    return NextResponse.json({
      recommendations: storedRecommendations.map((r) => ({
        id: r.id,
        ticker: r.ticker,
        action: r.action,
        reasoning: r.reasoning,
        confidence: r.confidence,
        holdingId: r.holdingId,
        holding: r.holding,
        generatedAt: r.generatedAt,
      })),
      generatedAt: storedRecommendations[0]?.createdAt ?? today,
      cached: false,
    })
  } catch (error) {
    console.error('Failed to get recommendations:', error)
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    )
  }
}
