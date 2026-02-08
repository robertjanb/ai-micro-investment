import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { FinnhubProvider } from '@/lib/data-sources/real/finnhub-provider'
import { getChatCompletion } from '@/lib/ai/claude'
import { dailyBriefingPrompt } from '@/lib/ai/prompts'
import type { NewsItem } from '@/lib/data-sources/types'

interface BriefingCacheEntry {
  briefing: string
  timestamp: number
}

const briefingCache = new Map<string, BriefingCacheEntry>()
const BRIEFING_CACHE_TTL = 2 * 60 * 60 * 1000 // 2 hours

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get user's holdings and watchlist tickers
    const [holdings, watchlistItems] = await Promise.all([
      prisma.holding.findMany({
        where: { userId: session.user.id },
        select: {
          ticker: true,
          companyName: true,
          quantity: true,
          purchasePrice: true,
          currentPrice: true,
        },
      }),
      prisma.watchlistItem.findMany({
        where: { userId: session.user.id },
        select: {
          idea: {
            select: { ticker: true },
          },
        },
      }),
    ])

    // Collect unique tickers, cap at 5
    const tickerSet = new Set<string>()
    for (const h of holdings) {
      tickerSet.add(h.ticker)
    }
    for (const w of watchlistItems) {
      tickerSet.add(w.idea.ticker)
    }
    const tickers = Array.from(tickerSet).slice(0, 5)

    if (tickers.length === 0) {
      return NextResponse.json({ news: [], briefing: '' })
    }

    // Fetch news for each ticker
    const finnhub = new FinnhubProvider()
    const newsResults = await Promise.all(
      tickers.map(async (ticker) => {
        const news = await finnhub.getCompanyNews(ticker)
        return news.map((n) => ({ ...n, ticker }))
      })
    )

    const allNews: Array<NewsItem & { ticker: string }> = newsResults
      .flat()
      .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())
      .slice(0, 20)

    // Serialize news for response
    const newsResponse = allNews.map((n) => ({
      ticker: n.ticker,
      headline: n.headline,
      summary: n.summary,
      source: n.source,
      datetime: n.datetime instanceof Date ? n.datetime.toISOString() : String(n.datetime),
      url: n.url,
    }))

    // Check briefing cache
    const cacheKey = session.user.id
    const cached = briefingCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < BRIEFING_CACHE_TTL) {
      return NextResponse.json({ news: newsResponse, briefing: cached.briefing })
    }

    // Generate AI briefing
    let briefing = ''
    try {
      const holdingsForPrompt = holdings.map((h) => ({
        ticker: h.ticker,
        companyName: h.companyName,
        quantity: h.quantity,
        purchasePrice: h.purchasePrice,
        currentPrice: h.currentPrice,
        gainLoss: (h.currentPrice - h.purchasePrice) * h.quantity,
        gainLossPercent: h.purchasePrice > 0
          ? ((h.currentPrice - h.purchasePrice) / h.purchasePrice) * 100
          : 0,
      }))

      const newsForPrompt = allNews.slice(0, 15).map((n) => ({
        ticker: n.ticker,
        headline: n.headline,
        summary: n.summary,
        source: n.source,
        datetime: n.datetime instanceof Date
          ? n.datetime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : String(n.datetime),
      }))

      const prompt = dailyBriefingPrompt(holdingsForPrompt, newsForPrompt)
      briefing = await getChatCompletion(
        [{ role: 'user', content: prompt }]
      )

      // Cache the briefing
      briefingCache.set(cacheKey, { briefing, timestamp: Date.now() })
    } catch (error) {
      console.error('Failed to generate AI briefing:', error)
      // Return news without briefing on AI failure
    }

    return NextResponse.json({ news: newsResponse, briefing })
  } catch (error) {
    console.error('Failed to fetch briefing:', error)
    return NextResponse.json({ error: 'Failed to load briefing' }, { status: 500 })
  }
}
