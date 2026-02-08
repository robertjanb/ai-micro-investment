import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
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
    const offset = (page - 1) * limit

    const dateWhere: Prisma.IdeaWhereInput = {}
    if (from || to) {
      dateWhere.generatedDate = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      }
    }

    const allIdeas = await prisma.idea.findMany({
      where: dateWhere,
      orderBy: { generatedDate: 'desc' },
      select: {
        id: true,
        ticker: true,
        companyName: true,
        oneLiner: true,
        riskLevel: true,
        confidenceScore: true,
        signals: true,
        initialPrice: true,
        currentPrice: true,
        currency: true,
        generatedDate: true,
      },
    })

    const filteredIdeas = allIdeas.filter((idea) => {
      if (filter === 'gains') {
        return idea.currentPrice > idea.initialPrice
      }
      if (filter === 'losses') {
        return idea.currentPrice <= idea.initialPrice
      }
      return true
    })

    const total = filteredIdeas.length
    const rows = filteredIdeas.slice(offset, offset + limit)

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

    const hitGeneratedDateFilter = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
      lt: sevenDaysAgo,
    }

    const hitIdeas = await prisma.idea.findMany({
      where: {
        generatedDate: hitGeneratedDateFilter,
      },
      select: {
        initialPrice: true,
        currentPrice: true,
      },
    })

    const wins = hitIdeas.reduce(
      (count, idea) => count + (idea.currentPrice > idea.initialPrice ? 1 : 0),
      0
    )
    const hitTotal = hitIdeas.length
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
