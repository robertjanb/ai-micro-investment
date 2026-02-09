import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getRecommendationProvider, getPriceProvider } from '@/lib/data-sources'
import type { HoldingData, Signals } from '@/lib/data-sources/types'
import { getConfidenceBucket, isPerformanceProofEnabled, normalizeDate } from '@/lib/performance'
import { getPerformanceFeedback } from '@/lib/performance-feedback'
import { ensureMockPerformanceHistory } from '@/lib/mock/performance-history'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const force = request.nextUrl.searchParams.get('force') === 'true'

  try {
    const today = normalizeDate()

    if (isPerformanceProofEnabled()) {
      await ensureMockPerformanceHistory(session.user.id)
    }

    // If force-refresh, delete existing recommendations for today
    if (force) {
      if (isPerformanceProofEnabled()) {
        await prisma.recommendationEvaluation.deleteMany({
          where: {
            snapshot: {
              userId: session.user.id,
              generatedDate: today,
            },
          },
        })
        await prisma.recommendationSnapshot.deleteMany({
          where: {
            userId: session.user.id,
            generatedDate: today,
          },
        })
      }

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
        if (isPerformanceProofEnabled()) {
          const existingSnapshots = await prisma.recommendationSnapshot.count({
            where: {
              userId: session.user.id,
              generatedDate: today,
            },
          })

          if (existingSnapshots === 0) {
            const [holdings, todaysIdeas] = await Promise.all([
              prisma.holding.findMany({
                where: { userId: session.user.id },
                select: {
                  id: true,
                  ideaId: true,
                  ticker: true,
                  currentPrice: true,
                },
              }),
              prisma.idea.findMany({
                where: { generatedDate: today },
                select: {
                  id: true,
                  ticker: true,
                  riskLevel: true,
                  currentPrice: true,
                  currency: true,
                },
              }),
            ])

            await createRecommendationSnapshots({
              userId: session.user.id,
              generatedDate: today,
              recommendations: existingRecommendations.map((r) => ({
                id: r.id,
                ticker: r.ticker,
                action: r.action,
                confidence: r.confidence,
                holdingId: r.holdingId,
                generatedAt: r.createdAt,
              })),
              holdings,
              todaysIdeas,
            })
          }
        }

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
        riskLevel: true,
        currentPrice: true,
        currency: true,
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

    // Fetch performance feedback for AI learning (best-effort)
    let performanceFeedback = null
    try {
      performanceFeedback = await getPerformanceFeedback(session.user.id)
    } catch {
      // Performance feedback is optional — don't block recommendations
    }

    // Generate recommendations
    const provider = getRecommendationProvider()
    const recommendations = await provider.generateRecommendations(holdingData, ideaData, performanceFeedback)

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

    if (isPerformanceProofEnabled()) {
      await createRecommendationSnapshots({
        userId: session.user.id,
        generatedDate: today,
        recommendations: storedRecommendations.map((r) => ({
          id: r.id,
          ticker: r.ticker,
          action: r.action,
          confidence: r.confidence,
          holdingId: r.holdingId,
          generatedAt: r.createdAt,
        })),
        holdings,
        todaysIdeas,
      })
    }

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

async function createRecommendationSnapshots({
  userId,
  generatedDate,
  recommendations,
  holdings,
  todaysIdeas,
}: {
  userId: string
  generatedDate: Date
  recommendations: Array<{
    id: string
    ticker: string
    action: string
    confidence: number
    holdingId: string | null
    generatedAt: Date
  }>
  holdings: Array<{
    id: string
    ideaId: string | null
    ticker: string
    currentPrice: number
  }>
  todaysIdeas: Array<{
    id: string
    ticker: string
    riskLevel: string
    currentPrice: number
    currency: string
  }>
}) {
  const ideaByTicker = new Map(todaysIdeas.map((idea) => [idea.ticker, idea]))
  const holdingByTicker = new Map(holdings.map((holding) => [holding.ticker, holding]))
  const priceCache = new Map<string, number | null>()
  const priceProvider = getPriceProvider()

  for (const recommendation of recommendations) {
    const holding = holdingByTicker.get(recommendation.ticker)
    const idea = ideaByTicker.get(recommendation.ticker)

    let entryPrice = holding?.currentPrice ?? idea?.currentPrice ?? null

    if (!entryPrice || entryPrice <= 0) {
      if (!priceCache.has(recommendation.ticker)) {
        try {
          const fetched = await priceProvider.getCurrentPrice(recommendation.ticker)
          priceCache.set(recommendation.ticker, fetched > 0 ? fetched : null)
        } catch {
          priceCache.set(recommendation.ticker, null)
        }
      }
      entryPrice = priceCache.get(recommendation.ticker) ?? null
    }

    if (!entryPrice || entryPrice <= 0) {
      continue
    }

    await prisma.recommendationSnapshot.create({
      data: {
        userId,
        recommendationId: recommendation.id,
        holdingId: recommendation.holdingId ?? holding?.id ?? null,
        ideaId: idea?.id ?? holding?.ideaId ?? null,
        ticker: recommendation.ticker,
        action: recommendation.action,
        confidence: recommendation.confidence,
        confidenceBucket: getConfidenceBucket(recommendation.confidence),
        generatedAt: recommendation.generatedAt,
        generatedDate,
        entryPrice,
        currency: idea?.currency ?? 'EUR',
        riskLevel: idea?.riskLevel ?? null,
      },
    })
  }
}
