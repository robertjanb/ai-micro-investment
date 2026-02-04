import type { PriceProvider, PricePoint } from '../types'
import { prisma } from '@/lib/prisma'

export class MockPriceProvider implements PriceProvider {
  async getCurrentPrice(ticker: string): Promise<number> {
    const idea = await prisma.idea.findFirst({
      where: { ticker },
      orderBy: { createdAt: 'desc' },
    })

    if (!idea) {
      throw new Error(`No idea found for ticker: ${ticker}`)
    }

    return idea.currentPrice
  }

  async getPriceHistory(ticker: string, days: number): Promise<PricePoint[]> {
    const idea = await prisma.idea.findFirst({
      where: { ticker },
      orderBy: { createdAt: 'desc' },
    })

    if (!idea) {
      return []
    }

    const since = new Date()
    since.setDate(since.getDate() - days)

    const history = await prisma.priceHistory.findMany({
      where: {
        ideaId: idea.id,
        timestamp: { gte: since },
      },
      orderBy: { timestamp: 'asc' },
    })

    return history.map((h) => ({
      price: h.price,
      timestamp: h.timestamp,
    }))
  }

  async updatePrices(tickers: string[]): Promise<void> {
    if (tickers.length === 0) return

    // Batch fetch all ideas at once to avoid N+1
    const ideas = await prisma.idea.findMany({
      where: { ticker: { in: tickers } },
      orderBy: { createdAt: 'desc' },
    })

    // Deduplicate by ticker (keep most recent)
    const byTicker = new Map<string, typeof ideas[0]>()
    for (const idea of ideas) {
      if (!byTicker.has(idea.ticker)) {
        byTicker.set(idea.ticker, idea)
      }
    }

    // Only update if last update was more than 1 hour ago
    const oneHourAgo = new Date(Date.now() - 3600000)

    for (const idea of Array.from(byTicker.values())) {
      if (idea.updatedAt > oneHourAgo) continue

      const drift = (Math.random() - 0.5) * 0.1 // -5% to +5%
      const newPrice = Math.round(idea.currentPrice * (1 + drift) * 100) / 100

      await prisma.$transaction([
        prisma.idea.update({
          where: { id: idea.id },
          data: { currentPrice: newPrice },
        }),
        prisma.priceHistory.create({
          data: {
            ideaId: idea.id,
            price: newPrice,
          },
        }),
      ])
    }
  }
}
