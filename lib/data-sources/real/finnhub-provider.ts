import type { NewsItem, EarningsEvent } from '../types'

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1'

interface FinnhubNewsResponse {
  category: string
  datetime: number
  headline: string
  id: number
  image: string
  related: string
  source: string
  summary: string
  url: string
}

interface FinnhubSentimentResponse {
  buzz?: {
    articlesInLastWeek: number
    weeklyAverage: number
    buzz: number
  }
  sentiment?: {
    bullishPercent: number
    bearishPercent: number
  }
  companyNewsScore?: number
  sectorAverageBullishPercent?: number
  sectorAverageNewsScore?: number
  symbol?: string
}

interface FinnhubEarningsResponse {
  earningsCalendar: Array<{
    date: string
    epsActual: number | null
    epsEstimate: number | null
    hour: string
    quarter: number
    revenueActual: number | null
    revenueEstimate: number | null
    symbol: string
    year: number
  }>
}

// Simple cache for Finnhub responses
interface CacheEntry<T> {
  data: T
  timestamp: number
}

const newsCache = new Map<string, CacheEntry<NewsItem[]>>()
const sentimentCache = new Map<string, CacheEntry<number | null>>()
const earningsCache = new Map<string, CacheEntry<EarningsEvent | null>>()

const NEWS_CACHE_TTL = 4 * 60 * 60 * 1000 // 4 hours
const SENTIMENT_CACHE_TTL = 4 * 60 * 60 * 1000 // 4 hours
const EARNINGS_CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

export class FinnhubProvider {
  private apiKey: string

  constructor() {
    const apiKey = process.env.FINNHUB_API_KEY
    if (!apiKey) {
      console.warn('FINNHUB_API_KEY not set - Finnhub features will be disabled')
    }
    this.apiKey = apiKey || ''
  }

  private async fetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T | null> {
    if (!this.apiKey) {
      return null
    }

    const url = new URL(`${FINNHUB_BASE_URL}${endpoint}`)
    url.searchParams.set('token', this.apiKey)
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }

    try {
      const response = await fetch(url.toString())
      if (!response.ok) {
        // 403 is expected for premium endpoints on free tier - don't log
        if (response.status !== 403) {
          console.error(`Finnhub API error: ${response.status} ${response.statusText}`)
        }
        return null
      }
      return await response.json() as T
    } catch (error) {
      console.error('Finnhub fetch error:', error)
      return null
    }
  }

  async getCompanyNews(ticker: string, days: number = 7): Promise<NewsItem[]> {
    // Check cache
    const cached = newsCache.get(ticker)
    if (cached && Date.now() - cached.timestamp < NEWS_CACHE_TTL) {
      return cached.data
    }

    // Finnhub only supports US tickers (no suffix)
    // For EU tickers like ASML.AS, we need to strip the suffix
    const finnhubTicker = ticker.split('.')[0]

    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - days)

    const formatDate = (d: Date) => d.toISOString().split('T')[0]

    const response = await this.fetch<FinnhubNewsResponse[]>('/company-news', {
      symbol: finnhubTicker,
      from: formatDate(from),
      to: formatDate(to),
    })

    if (!response || !Array.isArray(response)) {
      return []
    }

    const news: NewsItem[] = response.slice(0, 10).map((item) => ({
      headline: item.headline,
      summary: item.summary,
      source: item.source,
      datetime: new Date(item.datetime * 1000),
      url: item.url,
    }))

    // Cache the result
    newsCache.set(ticker, { data: news, timestamp: Date.now() })

    return news
  }

  async getNewsSentiment(ticker: string): Promise<number | null> {
    // Check cache
    const cached = sentimentCache.get(ticker)
    if (cached && Date.now() - cached.timestamp < SENTIMENT_CACHE_TTL) {
      return cached.data
    }

    const finnhubTicker = ticker.split('.')[0]

    const response = await this.fetch<FinnhubSentimentResponse>('/news-sentiment', {
      symbol: finnhubTicker,
    })

    if (!response || !response.sentiment) {
      sentimentCache.set(ticker, { data: null, timestamp: Date.now() })
      return null
    }

    // Convert to -1 to 1 scale
    // bullishPercent is 0-1, so we map 0 -> -1, 0.5 -> 0, 1 -> 1
    const sentiment = (response.sentiment.bullishPercent - 0.5) * 2

    sentimentCache.set(ticker, { data: sentiment, timestamp: Date.now() })
    return sentiment
  }

  async getUpcomingEarnings(ticker: string, daysAhead: number = 30): Promise<EarningsEvent | null> {
    // Check cache
    const cached = earningsCache.get(ticker)
    if (cached && Date.now() - cached.timestamp < EARNINGS_CACHE_TTL) {
      return cached.data
    }

    const finnhubTicker = ticker.split('.')[0]

    const from = new Date()
    const to = new Date()
    to.setDate(to.getDate() + daysAhead)

    const formatDate = (d: Date) => d.toISOString().split('T')[0]

    const response = await this.fetch<FinnhubEarningsResponse>('/calendar/earnings', {
      from: formatDate(from),
      to: formatDate(to),
      symbol: finnhubTicker,
    })

    if (!response || !response.earningsCalendar || response.earningsCalendar.length === 0) {
      earningsCache.set(ticker, { data: null, timestamp: Date.now() })
      return null
    }

    // Find the next upcoming earnings for this ticker
    const upcoming = response.earningsCalendar.find(
      (e) => e.symbol.toUpperCase() === finnhubTicker.toUpperCase()
    )

    if (!upcoming) {
      earningsCache.set(ticker, { data: null, timestamp: Date.now() })
      return null
    }

    const event: EarningsEvent = {
      ticker: ticker,
      date: new Date(upcoming.date),
      epsEstimate: upcoming.epsEstimate,
      epsActual: upcoming.epsActual,
      revenueEstimate: upcoming.revenueEstimate,
      revenueActual: upcoming.revenueActual,
    }

    earningsCache.set(ticker, { data: event, timestamp: Date.now() })
    return event
  }

  // Analyze news for specific signals
  analyzeNewsForSignals(news: NewsItem[]): {
    regulatory: boolean
    supplyChain: boolean
    hiring: boolean
  } {
    const regulatoryKeywords = [
      'FDA', 'SEC', 'regulatory', 'approval', 'compliance', 'investigation',
      'lawsuit', 'antitrust', 'GDPR', 'privacy', 'fine', 'penalty'
    ]
    const supplyChainKeywords = [
      'supply chain', 'shipping', 'inventory', 'shortage', 'logistics',
      'manufacturing', 'production', 'supplier', 'warehouse', 'delivery'
    ]
    const hiringKeywords = [
      'hiring', 'jobs', 'expansion', 'growth', 'revenue increase',
      'beat expectations', 'record', 'momentum', 'strong quarter'
    ]

    const allText = news.map((n) => `${n.headline} ${n.summary}`).join(' ').toLowerCase()

    return {
      regulatory: regulatoryKeywords.some((kw) => allText.includes(kw.toLowerCase())),
      supplyChain: supplyChainKeywords.some((kw) => allText.includes(kw.toLowerCase())),
      hiring: hiringKeywords.some((kw) => allText.includes(kw.toLowerCase())),
    }
  }
}
