import type { PriceProvider, PricePoint } from '../types'
import YahooFinance from 'yahoo-finance2'

// Create Yahoo Finance instance (required in v3)
const yahooFinance = new YahooFinance()

// Type for Yahoo Finance quote response (partial)
interface YahooQuote {
  symbol?: string
  regularMarketPrice?: number
  regularMarketChange?: number
  regularMarketChangePercent?: number
  currency?: string
  shortName?: string
  longName?: string
}

// Type for Yahoo Finance chart response (partial)
interface YahooChartQuote {
  date: Date | null
  close: number | null
}

interface YahooChartResult {
  quotes: YahooChartQuote[]
}

// Simple in-memory cache to avoid excessive API calls
interface CacheEntry {
  price: number
  timestamp: number
}

const priceCache = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 60000 // 1 minute cache

interface QuoteCacheEntry {
  quote: {
    price: number
    change: number
    changePercent: number
    currency: string
    name: string
  }
  timestamp: number
}

const quoteCache = new Map<string, QuoteCacheEntry>()
const QUOTE_CACHE_TTL_MS = 120000 // 2 minute cache

export class YahooPriceProvider implements PriceProvider {
  async getCurrentPrice(ticker: string): Promise<number> {
    const cached = priceCache.get(ticker)
    const now = Date.now()

    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return cached.price
    }

    try {
      const quote = await yahooFinance.quote(ticker, {}, { validateResult: false }) as YahooQuote

      if (!quote || !quote.regularMarketPrice) {
        throw new Error(`No price data for ticker: ${ticker}`)
      }

      const price = quote.regularMarketPrice
      priceCache.set(ticker, { price, timestamp: now })

      return price
    } catch (error) {
      // If we have stale cache, return it rather than failing
      if (cached) {
        return cached.price
      }
      throw new Error(`Failed to fetch price for ${ticker}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getPriceHistory(ticker: string, days: number): Promise<PricePoint[]> {
    try {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const result = await yahooFinance.chart(ticker, {
        period1: startDate,
        period2: endDate,
        interval: '1d',
      }) as YahooChartResult

      if (!result || !result.quotes || result.quotes.length === 0) {
        return []
      }

      return result.quotes
        .filter((q) => q.close !== null && q.date !== null)
        .map((q) => ({
          price: q.close as number,
          timestamp: q.date as Date,
        }))
    } catch (error) {
      console.error(`Failed to fetch price history for ${ticker}:`, error)
      return []
    }
  }

  async updatePrices(tickers: string[]): Promise<void> {
    if (tickers.length === 0) return

    // Batch fetch quotes for efficiency
    try {
      const results = await yahooFinance.quote(tickers, {}, { validateResult: false }) as YahooQuote | YahooQuote[]
      const now = Date.now()

      // Handle both single result and array of results
      const quotes = Array.isArray(results) ? results : [results]

      for (const quote of quotes) {
        if (quote && quote.symbol && quote.regularMarketPrice) {
          priceCache.set(quote.symbol, {
            price: quote.regularMarketPrice,
            timestamp: now,
          })
        }
      }
    } catch (error) {
      console.error('Failed to batch update prices:', error)
      // Fall back to individual fetches
      for (const ticker of tickers) {
        try {
          await this.getCurrentPrice(ticker)
        } catch {
          // Ignore individual failures
        }
      }
    }
  }

  // Utility method to check if a ticker is valid
  async validateTicker(ticker: string): Promise<boolean> {
    try {
      const quote = await yahooFinance.quote(ticker, {}, { validateResult: false }) as YahooQuote
      return !!(quote && quote.regularMarketPrice)
    } catch {
      return false
    }
  }

  // Get additional quote info (for displaying in UI)
  async getQuoteInfo(ticker: string): Promise<{
    price: number
    change: number
    changePercent: number
    currency: string
    name: string
  } | null> {
    try {
      const cacheKey = ticker.toUpperCase()
      const cached = quoteCache.get(cacheKey)
      const now = Date.now()

      if (cached && now - cached.timestamp < QUOTE_CACHE_TTL_MS) {
        return cached.quote
      }

      const quote = await yahooFinance.quote(cacheKey, {}, { validateResult: false }) as YahooQuote

      if (!quote || !quote.regularMarketPrice) {
        return null
      }

      const quoteInfo = {
        price: quote.regularMarketPrice,
        change: quote.regularMarketChange ?? 0,
        changePercent: quote.regularMarketChangePercent ?? 0,
        currency: quote.currency ?? 'USD',
        name: quote.shortName ?? quote.longName ?? ticker,
      }

      quoteCache.set(cacheKey, { quote: quoteInfo, timestamp: now })

      return quoteInfo
    } catch {
      return null
    }
  }
}
