import type { IdeaProvider, Idea, IdeaDetails, PricePoint, RealStockData, EnrichedStockData, Signals } from '../types'
import type { RealStockDataForPrompt } from '@/lib/ai/prompts'
import { getChatCompletion } from '@/lib/ai/claude'
import { realStockAnalysisPrompt } from '@/lib/ai/prompts'
import { prisma } from '@/lib/prisma'
import { FinnhubProvider } from './finnhub-provider'
import YahooFinance from 'yahoo-finance2'

// Create Yahoo Finance instance
const yahooFinance = new YahooFinance()

// USD to EUR conversion rate (fetched on startup, refreshed periodically)
let usdToEur = 0.92 // Default fallback
let exchangeRateLastFetched = 0
const EXCHANGE_RATE_TTL = 60 * 60 * 1000 // 1 hour

async function getUsdToEur(): Promise<number> {
  if (Date.now() - exchangeRateLastFetched < EXCHANGE_RATE_TTL) {
    return usdToEur
  }

  try {
    const quote = await yahooFinance.quote('EURUSD=X')
    if (quote && typeof quote === 'object' && 'regularMarketPrice' in quote) {
      const price = quote.regularMarketPrice as number
      // EURUSD quote gives us how many USD per EUR, we need USD to EUR
      usdToEur = 1 / price
      exchangeRateLastFetched = Date.now()
    }
  } catch (error) {
    console.warn('Failed to fetch exchange rate, using cached value:', error)
  }

  return usdToEur
}

// Cache for screener results
interface ScreenerCache {
  tickers: string[]
  timestamp: number
}

const screenerCache = new Map<string, ScreenerCache>()
const SCREENER_CACHE_TTL = 60 * 60 * 1000 // 1 hour

// Cache for fundamentals
interface FundamentalsCache {
  data: RealStockData
  timestamp: number
}

const fundamentalsCache = new Map<string, FundamentalsCache>()
const FUNDAMENTALS_CACHE_TTL = 4 * 60 * 60 * 1000 // 4 hours

// Markets to pull from
const MARKETS = [
  { region: 'US', suffix: '' },
  { region: 'DE', suffix: '.DE' }, // Germany (XETRA)
  { region: 'FR', suffix: '.PA' }, // France (Euronext Paris)
  { region: 'NL', suffix: '.AS' }, // Netherlands (Euronext Amsterdam)
  { region: 'GB', suffix: '.L' },  // UK (London)
]

// Type definitions for Yahoo Finance responses
interface YahooQuoteSummary {
  price?: {
    regularMarketPrice?: number
    regularMarketChange?: number
    regularMarketChangePercent?: number
    currency?: string
    marketCap?: number
    exchange?: string
    exchangeName?: string
    shortName?: string
    longName?: string
  }
  summaryDetail?: {
    trailingPE?: number
    forwardPE?: number
    fiftyTwoWeekLow?: number
    fiftyTwoWeekHigh?: number
    dividendYield?: number
  }
  assetProfile?: {
    sector?: string
    industry?: string
    longBusinessSummary?: string
    country?: string
  }
  financialData?: {
    totalRevenue?: number
    profitMargins?: number
    totalDebt?: number
    currentRatio?: number
  }
}

interface YahooScreenerResult {
  quotes?: Array<{
    symbol?: string
    shortName?: string
    regularMarketPrice?: number
    marketCap?: number
  }>
}

interface YahooTrendingResult {
  quotes?: Array<{
    symbol?: string
  }>
}

export class RealIdeaProvider implements IdeaProvider {
  private finnhub: FinnhubProvider

  constructor() {
    this.finnhub = new FinnhubProvider()
  }

  async generateDailyIdeas(count: number): Promise<Idea[]> {
    // 1. Get candidate stocks from multiple sources
    const candidates = await this.getCandidateStocks(count * 3) // Get 3x to have selection

    if (candidates.length === 0) {
      throw new Error('Failed to fetch any candidate stocks')
    }

    // 2. Fetch fundamentals for top candidates
    const enrichedCandidates = await this.enrichWithFundamentals(candidates.slice(0, count * 2))

    // 3. Filter to best candidates
    const filteredCandidates = this.filterCandidates(enrichedCandidates).slice(0, count)

    if (filteredCandidates.length === 0) {
      throw new Error('No suitable candidates after filtering')
    }

    // 4. Enrich with Finnhub data (news, sentiment, earnings)
    const fullyEnriched = await this.enrichWithFinnhub(filteredCandidates)

    // 5. Generate AI analysis
    const ideas = await this.generateAnalysis(fullyEnriched)

    return ideas
  }

  private async getCandidateStocks(count: number): Promise<string[]> {
    const allCandidates: string[] = []

    // Try to get stocks from different sources
    const sources = [
      this.getTrendingStocks.bind(this),
      this.getScreenerStocks.bind(this, 'day_gainers'),
      this.getScreenerStocks.bind(this, 'most_actives'),
    ]

    for (const source of sources) {
      try {
        const tickers = await source()
        allCandidates.push(...tickers)
      } catch (error) {
        console.warn('Failed to fetch from source:', error)
      }
    }

    // Remove duplicates and return requested count
    const unique = Array.from(new Set(allCandidates))

    // Shuffle to get variety
    const shuffled = unique.sort(() => Math.random() - 0.5)

    return shuffled.slice(0, count)
  }

  private async getTrendingStocks(): Promise<string[]> {
    const cacheKey = 'trending'
    const cached = screenerCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < SCREENER_CACHE_TTL) {
      return cached.tickers
    }

    const tickers: string[] = []

    // Fetch trending from multiple regions
    for (const market of MARKETS) {
      try {
        const result = await yahooFinance.trendingSymbols(market.region) as YahooTrendingResult
        if (result && result.quotes) {
          const symbols = result.quotes
            .map((q) => q.symbol)
            .filter((s): s is string => typeof s === 'string')
            .slice(0, 5) // Take top 5 from each region

          tickers.push(...symbols)
        }
      } catch (error) {
        console.warn(`Failed to fetch trending for ${market.region}:`, error)
      }
    }

    screenerCache.set(cacheKey, { tickers, timestamp: Date.now() })
    return tickers
  }

  private async getScreenerStocks(screenerType: string): Promise<string[]> {
    const cacheKey = `screener_${screenerType}`
    const cached = screenerCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < SCREENER_CACHE_TTL) {
      return cached.tickers
    }

    try {
      // Cast to expected type - yahoo-finance2 expects specific screener IDs
      const result = await yahooFinance.screener({
        scrIds: screenerType as 'day_gainers' | 'most_actives',
        count: 25,
      }) as YahooScreenerResult

      if (!result || !result.quotes) {
        return []
      }

      const tickers = result.quotes
        .map((q) => q.symbol)
        .filter((s): s is string => typeof s === 'string')

      screenerCache.set(cacheKey, { tickers, timestamp: Date.now() })
      return tickers
    } catch (error) {
      console.warn(`Failed to fetch screener ${screenerType}:`, error)
      return []
    }
  }

  private async enrichWithFundamentals(tickers: string[]): Promise<RealStockData[]> {
    const enriched: RealStockData[] = []
    const usdEur = await getUsdToEur()

    for (const ticker of tickers) {
      // Check cache
      const cached = fundamentalsCache.get(ticker)
      if (cached && Date.now() - cached.timestamp < FUNDAMENTALS_CACHE_TTL) {
        enriched.push(cached.data)
        continue
      }

      try {
        const summary = await yahooFinance.quoteSummary(ticker, {
          modules: ['price', 'summaryDetail', 'assetProfile', 'financialData'],
        }) as YahooQuoteSummary

        if (!summary || !summary.price || !summary.price.regularMarketPrice) {
          continue
        }

        const price = summary.price
        const detail = summary.summaryDetail || {}
        const profile = summary.assetProfile || {}

        // Determine currency and convert to EUR
        const currency = price.currency || 'USD'
        const priceValue = price.regularMarketPrice!
        const priceEur = currency === 'EUR' ? priceValue : priceValue * usdEur

        const stockData: RealStockData = {
          ticker,
          companyName: price.longName || price.shortName || ticker,
          price: priceValue,
          priceEur,
          currency,
          marketCap: price.marketCap ?? 0,
          peRatio: detail.trailingPE ?? detail.forwardPE ?? null,
          fiftyTwoWeekLow: detail.fiftyTwoWeekLow ?? priceValue * 0.8,
          fiftyTwoWeekHigh: detail.fiftyTwoWeekHigh ?? priceValue * 1.2,
          sector: profile.sector || 'Unknown',
          industry: profile.industry || 'Unknown',
          exchange: price.exchangeName || price.exchange || 'Unknown',
          recentChange: price.regularMarketChangePercent || 0,
          dividendYield: detail.dividendYield || null,
          description: profile.longBusinessSummary || '',
        }

        fundamentalsCache.set(ticker, { data: stockData, timestamp: Date.now() })
        enriched.push(stockData)
      } catch (error) {
        console.warn(`Failed to fetch fundamentals for ${ticker}:`, error)
      }
    }

    return enriched
  }

  private filterCandidates(candidates: RealStockData[]): RealStockData[] {
    return candidates.filter((c) => {
      // Filter by market cap (> €500M)
      const marketCapEur = c.currency === 'EUR' ? c.marketCap : c.marketCap * usdToEur
      if (marketCapEur < 500_000_000) return false

      // Filter by price (> €5)
      if (c.priceEur < 5) return false

      // Must have sector info
      if (c.sector === 'Unknown') return false

      // Must have a description
      if (!c.description || c.description.length < 50) return false

      return true
    })
  }

  private async enrichWithFinnhub(candidates: RealStockData[]): Promise<EnrichedStockData[]> {
    const enriched: EnrichedStockData[] = []

    for (const candidate of candidates) {
      const [news, sentiment, earnings] = await Promise.all([
        this.finnhub.getCompanyNews(candidate.ticker),
        this.finnhub.getNewsSentiment(candidate.ticker),
        this.finnhub.getUpcomingEarnings(candidate.ticker),
      ])

      enriched.push({
        ...candidate,
        news,
        upcomingEarnings: earnings,
        newsSentiment: sentiment,
      })
    }

    return enriched
  }

  private async generateAnalysis(stocks: EnrichedStockData[]): Promise<Idea[]> {
    // Convert to prompt format
    const promptData: RealStockDataForPrompt[] = stocks.map((s) => ({
      ...s,
      newsHeadlines: s.news.slice(0, 5).map((n) => n.headline),
      upcomingEarningsDate: s.upcomingEarnings
        ? s.upcomingEarnings.date.toISOString().split('T')[0]
        : null,
    }))

    const prompt = realStockAnalysisPrompt(promptData)

    const response = await getChatCompletion([
      { role: 'user', content: prompt },
    ])

    let parsed: { ideas: Array<Record<string, unknown>> }
    try {
      parsed = JSON.parse(response)
    } catch {
      throw new Error('AI returned invalid JSON for real stock analysis')
    }

    if (!parsed.ideas || !Array.isArray(parsed.ideas)) {
      throw new Error('AI response missing ideas array')
    }

    // Map AI response to Idea interface, adding signals from real data
    const ideas: Idea[] = parsed.ideas.map((aiIdea) => {
      const ticker = String(aiIdea.ticker || '')
      const stockData = stocks.find((s) => s.ticker === ticker)

      // Generate signals from real data
      const signals = this.generateSignals(stockData)

      return {
        ticker,
        companyName: String(aiIdea.companyName || stockData?.companyName || ''),
        oneLiner: String(aiIdea.oneLiner || ''),
        thesis: String(aiIdea.thesis || ''),
        bearCase: String(aiIdea.bearCase || ''),
        confidenceScore: Number(aiIdea.confidenceScore) || 60,
        signals,
        riskLevel: (['safe', 'interesting', 'spicy'].includes(aiIdea.riskLevel as string)
          ? aiIdea.riskLevel
          : 'interesting') as Idea['riskLevel'],
        initialPrice: stockData?.priceEur || Number(aiIdea.initialPrice) || 50,
        currency: 'EUR',
      }
    })

    return ideas
  }

  private generateSignals(stockData?: EnrichedStockData): Signals {
    if (!stockData) {
      return {
        hiring: false,
        earnings: false,
        regulatory: false,
        supplyChain: false,
      }
    }

    // Earnings signal: true if reporting within 14 days
    const earningsSignal = stockData.upcomingEarnings !== null &&
      stockData.upcomingEarnings.date.getTime() - Date.now() < 14 * 24 * 60 * 60 * 1000

    // News-based signals
    const newsSignals = this.finnhub.analyzeNewsForSignals(stockData.news)

    // Hiring signal: positive sentiment + growth sector, or positive news
    const growthSectors = ['Technology', 'Healthcare', 'Consumer Cyclical', 'Communication Services']
    const hiringSignal = newsSignals.hiring ||
      (stockData.newsSentiment !== null &&
        stockData.newsSentiment > 0.2 &&
        growthSectors.includes(stockData.sector))

    return {
      hiring: hiringSignal,
      earnings: earningsSignal,
      regulatory: newsSignals.regulatory,
      supplyChain: newsSignals.supplyChain,
    }
  }

  async getIdeaDetails(ticker: string): Promise<IdeaDetails> {
    // First try to get from database
    const idea = await prisma.idea.findFirst({
      where: { ticker },
      orderBy: { createdAt: 'desc' },
      include: {
        priceHistory: {
          orderBy: { timestamp: 'asc' },
          take: 30,
        },
      },
    })

    if (!idea) {
      throw new Error(`No idea found for ticker: ${ticker}`)
    }

    // Get current price from Yahoo Finance
    let currentPrice = idea.currentPrice
    try {
      const quote = await yahooFinance.quote(ticker)
      if (quote && typeof quote === 'object' && 'regularMarketPrice' in quote) {
        const price = quote.regularMarketPrice as number
        const currency = (quote as { currency?: string }).currency || 'USD'
        const usdEur = await getUsdToEur()
        currentPrice = currency === 'EUR' ? price : price * usdEur
      }
    } catch (error) {
      console.warn(`Failed to fetch current price for ${ticker}, using stored price:`, error)
    }

    const priceHistory: PricePoint[] = idea.priceHistory.map((h) => ({
      price: h.price,
      timestamp: h.timestamp,
    }))

    return {
      ticker: idea.ticker,
      companyName: idea.companyName,
      oneLiner: idea.oneLiner,
      thesis: idea.thesis,
      bearCase: idea.bearCase,
      confidenceScore: idea.confidenceScore,
      signals: idea.signals as unknown as Signals,
      riskLevel: idea.riskLevel as Idea['riskLevel'],
      initialPrice: idea.initialPrice,
      currentPrice,
      currency: idea.currency,
      priceHistory,
    }
  }
}
