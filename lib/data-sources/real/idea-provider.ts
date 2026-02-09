import type { IdeaProvider, Idea, IdeaDetails, PricePoint, RealStockData, EnrichedStockData, Signals } from '../types'
import type { RealStockDataForPrompt } from '@/lib/ai/prompts'
import { getChatCompletion } from '@/lib/ai/claude'
import { realStockAnalysisPrompt } from '@/lib/ai/prompts'
import { prisma } from '@/lib/prisma'
import { getIdeaConfig, MARKET_SUFFIXES, type IdeaConfigData } from '@/lib/idea-config'
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
    const quote = await yahooFinance.quote('EURUSD=X', {}, { validateResult: false })
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

// Build markets list from config
function getMarkets(config: IdeaConfigData) {
  return config.markets.map((region) => ({
    region,
    suffix: MARKET_SUFFIXES[region] ?? '',
  }))
}

const MARKET_FALLBACK_TICKERS: Record<string, string[]> = {
  US: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'BRK-B', 'JPM', 'XOM', 'JNJ',
       'F', 'T', 'INTC', 'SNAP', 'PLTR', 'SOFI', 'NIO', 'RIVN', 'LCID', 'WBD'],
  DE: ['SAP.DE', 'SIE.DE', 'ALV.DE', 'BAS.DE', 'BMW.DE', 'MBG.DE', 'VOW3.DE', 'DB1.DE', 'DTE.DE', 'IFX.DE',
       'TUI1.DE', 'LHA.DE', 'AT1.DE', 'BYW6.DE', 'PBB.DE', 'NDA.DE', '1COV.DE', 'SRT3.DE', 'GXI.DE', 'FPE3.DE'],
  FR: ['MC.PA', 'OR.PA', 'TTE.PA', 'SAN.PA', 'AIR.PA', 'BNP.PA', 'SU.PA', 'DG.PA', 'ORA.PA', 'EN.PA',
       'ACA.PA', 'RNO.PA', 'GLE.PA', 'UBI.PA', 'CGG.PA', 'ATOS.PA', 'DBV.PA', 'VIE.PA'],
  NL: ['AD.AS', 'AALB.AS', 'ABN.AS', 'AKZA.AS', 'ASM.AS', 'ASML.AS', 'ASRNL.AS', 'BESI.AS', 'INGA.AS', 'KPN.AS', 'NN.AS', 'PHIA.AS', 'RAND.AS', 'SHELL.AS', 'WKL.AS',
       'BAMNB.AS', 'OCI.AS', 'APAM.AS', 'SBMO.AS', 'ARCAD.AS', 'HEIJM.AS'],
  GB: ['AZN.L', 'ULVR.L', 'SHEL.L', 'RIO.L', 'HSBA.L', 'BARC.L', 'BP.L', 'GSK.L', 'DGE.L', 'VOD.L',
       'LLOY.L', 'IAG.L', 'EZJ.L', 'PHNX.L', 'MNG.L', 'NWG.L', 'LGEN.L', 'RR.L', 'AAL.L', 'AVV.L'],
}

const NON_US_SUFFIXES = Array.from(
  new Set(
    Object.entries(MARKET_SUFFIXES)
      .filter(([market, suffix]) => market !== 'US' && suffix)
      .map(([, suffix]) => suffix.toUpperCase())
  )
)

function isUsTicker(ticker: string): boolean {
  const normalized = ticker.toUpperCase()

  if (normalized.startsWith('^')) return false // Indexes
  if (NON_US_SUFFIXES.some((suffix) => normalized.endsWith(suffix))) return false
  if (normalized.includes('.')) return false

  return /^[A-Z0-9-]+$/.test(normalized)
}

function isTickerAllowedForMarkets(ticker: string, markets: string[]): boolean {
  const normalized = ticker.toUpperCase()
  const allowUS = markets.includes('US')
  const allowedNonUsSuffixes = markets
    .map((market) => MARKET_SUFFIXES[market])
    .filter((suffix): suffix is string => Boolean(suffix))
    .map((suffix) => suffix.toUpperCase())

  if (allowUS && isUsTicker(normalized)) {
    return true
  }

  if (allowedNonUsSuffixes.length > 0) {
    return allowedNonUsSuffixes.some((suffix) => normalized.endsWith(suffix))
  }

  return false
}

function getFallbackTickers(config: IdeaConfigData): string[] {
  return config.markets.flatMap((market) => MARKET_FALLBACK_TICKERS[market] || [])
}

function getTickerBase(ticker: string): string {
  return ticker.toUpperCase().split('.')[0]
}

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

interface YahooQuote {
  regularMarketPrice?: number
  regularMarketPreviousClose?: number
  currency?: string
}

export class RealIdeaProvider implements IdeaProvider {
  private finnhub: FinnhubProvider

  constructor() {
    this.finnhub = new FinnhubProvider()
  }

  async generateDailyIdeas(count: number): Promise<Idea[]> {
    const config = await getIdeaConfig()

    // 1. Get candidate stocks from multiple sources (fetch extra to survive filtering)
    const candidates = await this.getCandidateStocks(count * 5, config)

    if (candidates.length === 0) {
      console.warn('No candidate stocks found from any source')
      return []
    }

    // 2. Fetch fundamentals for top candidates
    const enrichedCandidates = await this.enrichWithFundamentals(candidates.slice(0, count * 3))

    // 3. Filter to best candidates
    const filteredCandidates = this.filterCandidates(enrichedCandidates, config).slice(0, count)

    if (filteredCandidates.length === 0) {
      console.warn('No candidates passed filters — preferences may be too restrictive')
      return []
    }

    // 4. Enrich with Finnhub data (news, sentiment, earnings)
    const fullyEnriched = await this.enrichWithFinnhub(filteredCandidates)

    // 5. Generate AI analysis
    let ideas = await this.generateAnalysis(fullyEnriched)
    if (ideas.length === 0 && fullyEnriched.length > 0) {
      console.warn('AI produced no mappable ideas; using deterministic fallback ideas')
      ideas = this.buildFallbackIdeas(fullyEnriched, count)
    }

    // 6. Post-filter by risk levels if configured
    if (config.riskLevels.length > 0) {
      return ideas.filter((idea) => config.riskLevels.includes(idea.riskLevel))
    }

    return ideas
  }

  private buildFallbackIdeas(stocks: EnrichedStockData[], count: number): Idea[] {
    return stocks.slice(0, count).map((stock) => {
      const marketCapEur = stock.currency === 'EUR' ? stock.marketCap : stock.marketCap * usdToEur
      const riskLevel: Idea['riskLevel'] =
        marketCapEur >= 20_000_000_000 ? 'safe' : marketCapEur >= 2_000_000_000 ? 'interesting' : 'spicy'

      return {
        ticker: stock.ticker,
        companyName: stock.companyName,
        oneLiner: `${stock.companyName} (${stock.ticker}) is trading near €${stock.priceEur.toFixed(2)} with active market coverage.`,
        thesis: `${stock.companyName} operates in ${stock.sector}. Current market data shows a price of €${stock.priceEur.toFixed(2)} and a market cap around €${(marketCapEur / 1e9).toFixed(2)}B. This can be a watchlist candidate if upcoming catalysts and sector momentum improve.`,
        bearCase: `Key risks include valuation compression, weaker sector demand, and execution risk if earnings or margins disappoint. Treat this as a screening result, not a complete thesis.`,
        confidenceScore: 58,
        signals: {
          hiring: false,
          earnings: Boolean(stock.upcomingEarnings),
          regulatory: false,
          supplyChain: false,
        },
        riskLevel,
        initialPrice: stock.priceEur,
        currency: 'EUR',
      }
    })
  }

  private async getCandidateStocks(count: number, config: IdeaConfigData): Promise<string[]> {
    const allCandidates: string[] = []

    // Try to get stocks from different sources
    const sources: Array<() => Promise<string[]>> = [
      () => this.getTrendingStocks(config),
      () => this.searchByMarketAndPrice(config),
    ]

    // Only include US-specific screeners if US is in the selected markets
    if (config.markets.includes('US')) {
      sources.push(
        () => this.getScreenerStocks('day_gainers'),
        () => this.getScreenerStocks('most_actives'),
        () => this.getScreenerStocks('small_cap_gainers'),
        () => this.getScreenerStocks('undervalued_growth_stocks'),
      )
    }

    for (const source of sources) {
      try {
        const tickers = await source()
        allCandidates.push(...tickers)
      } catch (error) {
        console.warn('Failed to fetch from source:', error)
      }
    }

    // Add a deterministic market universe fallback so strict market filters
    // still have candidates even when trend/screener endpoints are sparse.
    allCandidates.push(...getFallbackTickers(config))

    // Remove duplicates and return requested count
    const unique = Array.from(new Set(allCandidates))
    const marketFiltered = unique.filter((ticker) => isTickerAllowedForMarkets(ticker, config.markets))

    // Shuffle to get variety
    const shuffled = marketFiltered.sort(() => Math.random() - 0.5)

    return shuffled.slice(0, count)
  }

  /**
   * Search for stocks in the configured markets that match price/cap filters.
   * Uses Yahoo Finance search and quote to find candidates that actually fit
   * the user's preferences, instead of relying on US-only screeners.
   */
  private async searchByMarketAndPrice(config: IdeaConfigData): Promise<string[]> {
    const cacheKey = `search_${config.markets.join(',')}_${config.minPriceEur}_${config.maxPriceEur}`
    const cached = screenerCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < SCREENER_CACHE_TTL) {
      return cached.tickers
    }

    const tickers: string[] = []
    const markets = getMarkets(config)

    // Search terms that tend to surface a variety of stocks in each market
    const searchTerms = ['bank', 'energy', 'tech', 'pharma', 'telecom', 'retail', 'auto', 'insurance', 'food', 'real estate']

    for (const market of markets) {
      if (market.suffix === '') continue // Skip US — handled by screeners

      for (const term of searchTerms) {
        try {
          const results = await yahooFinance.search(term, {
            newsCount: 0,
            quotesCount: 10,
          }, { validateResult: false }) as { quotes?: Array<{ symbol?: string; exchange?: string; quoteType?: string }> }

          if (results?.quotes) {
            const marketSuffix = market.suffix
            const matched = results.quotes
              .filter((q) => {
                if (!q.symbol || q.quoteType !== 'EQUITY') return false
                // Match by suffix (e.g. .DE, .PA, .AS, .L)
                return q.symbol.endsWith(marketSuffix)
              })
              .map((q) => q.symbol!)

            tickers.push(...matched)
          }
        } catch (error) {
          console.warn(`Search failed for "${term}" in ${market.region}:`, error)
        }
      }
    }

    const unique = Array.from(new Set(tickers))
    screenerCache.set(cacheKey, { tickers: unique, timestamp: Date.now() })
    return unique
  }

  private async getTrendingStocks(config: IdeaConfigData): Promise<string[]> {
    const cacheKey = `trending:${[...config.markets].sort().join(',')}`
    const cached = screenerCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < SCREENER_CACHE_TTL) {
      return cached.tickers
    }

    const tickers: string[] = []
    const markets = getMarkets(config)

    // Fetch trending from multiple regions
    for (const market of markets) {
      try {
        const result = await yahooFinance.trendingSymbols(market.region, {}, { validateResult: false }) as YahooTrendingResult
        if (result && result.quotes) {
          const symbols = result.quotes
            .map((q) => q.symbol)
            .filter((s): s is string => typeof s === 'string')
            .slice(0, 10) // Take top 10 from each region

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
      const result = await yahooFinance.screener(
        { scrIds: screenerType as 'day_gainers' | 'most_actives', count: 40 },
        undefined,
        { validateResult: false },
      ) as YahooScreenerResult

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
    let missingPrice = 0
    let fetchErrors = 0

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
        }, { validateResult: false }) as YahooQuoteSummary

        if (!summary || !summary.price) {
          missingPrice++
          continue
        }

        const price = summary.price
        const detail = summary.summaryDetail || {}
        const profile = summary.assetProfile || {}

        // Determine currency and convert to EUR.
        // Some non-US symbols can miss regularMarketPrice in quoteSummary;
        // fall back to quote() and previous close to avoid false negatives.
        let currency = price.currency || 'USD'
        let priceValue = price.regularMarketPrice ?? null
        if (priceValue === null || priceValue <= 0) {
          try {
            const quote = await yahooFinance.quote(ticker, {}, { validateResult: false }) as YahooQuote
            const fallbackPrice = quote.regularMarketPrice ?? quote.regularMarketPreviousClose ?? null
            if (fallbackPrice !== null && fallbackPrice > 0) {
              priceValue = fallbackPrice
              currency = quote.currency || currency
            }
          } catch {
            // Keep priceValue as null; handled below
          }
        }
        if (priceValue === null || priceValue <= 0) {
          missingPrice++
          continue
        }

        const priceEur = currency === 'EUR' ? priceValue : priceValue * usdEur

        const financialData = summary.financialData || {}

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
          totalRevenue: financialData.totalRevenue ?? null,
          profitMargins: financialData.profitMargins ?? null,
          totalDebt: financialData.totalDebt ?? null,
          currentRatio: financialData.currentRatio ?? null,
        }

        fundamentalsCache.set(ticker, { data: stockData, timestamp: Date.now() })
        enriched.push(stockData)
      } catch (error) {
        fetchErrors++
        console.warn(`Failed to fetch fundamentals for ${ticker}:`, error)
      }
    }

    if (enriched.length === 0 && tickers.length > 0) {
      console.warn(
        `No fundamentals enriched (tickers=${tickers.length}, missingPrice=${missingPrice}, fetchErrors=${fetchErrors})`
      )
    }

    return enriched
  }

  private filterCandidates(candidates: RealStockData[], config: IdeaConfigData): RealStockData[] {
    const reasons: Record<string, number> = {}
    const bump = (key: string) => { reasons[key] = (reasons[key] || 0) + 1 }

    // Build set of allowed exchange suffixes for market filtering
    const allowedSuffixes = new Set(config.markets.map((m) => MARKET_SUFFIXES[m] ?? ''))

    const filtered = candidates.filter((c) => {
      // Filter by selected markets based on ticker suffix / US symbol rules
      if (!isTickerAllowedForMarkets(c.ticker, config.markets)) { bump('marketNotAllowed'); return false }

      // Filter by market cap
      const marketCapEur = c.currency === 'EUR' ? c.marketCap : c.marketCap * usdToEur
      if (config.minMarketCapEur > 0 && marketCapEur < config.minMarketCapEur) { bump('marketCapTooLow'); return false }
      if (config.maxMarketCapEur !== null && marketCapEur > config.maxMarketCapEur) { bump('marketCapTooHigh'); return false }

      // Filter by price
      if (c.priceEur < config.minPriceEur) { bump('priceTooLow'); return false }
      if (config.maxPriceEur !== null && c.priceEur > config.maxPriceEur) { bump('priceTooHigh'); return false }

      // Filter by P/E ratio
      if (config.minPeRatio !== null && (c.peRatio === null || c.peRatio < config.minPeRatio)) { bump('peRatio'); return false }
      if (config.maxPeRatio !== null && (c.peRatio === null || c.peRatio > config.maxPeRatio)) { bump('peRatio'); return false }

      // Filter by dividend yield
      if (config.minDividendYield !== null && (c.dividendYield === null || c.dividendYield < config.minDividendYield)) { bump('dividendYield'); return false }

      // Filter by sectors (allowlist)
      if (config.sectors.length > 0 && !config.sectors.includes(c.sector)) { bump('sectorNotAllowed'); return false }

      // Filter by excluded sectors
      if (config.excludedSectors.length > 0 && config.excludedSectors.includes(c.sector)) { bump('sectorExcluded'); return false }

      return true
    })

    if (filtered.length === 0 && candidates.length > 0) {
      console.warn(`All ${candidates.length} candidates filtered out:`, reasons)
    }

    return filtered
  }

  private async enrichWithFinnhub(candidates: RealStockData[]): Promise<EnrichedStockData[]> {
    const enriched: EnrichedStockData[] = []

    for (const candidate of candidates) {
      const [news, sentimentResult, earnings] = await Promise.all([
        this.finnhub.getCompanyNews(candidate.ticker),
        this.finnhub.getNewsSentiment(candidate.ticker),
        this.finnhub.getUpcomingEarnings(candidate.ticker),
      ])

      enriched.push({
        ...candidate,
        news,
        upcomingEarnings: earnings,
        newsSentiment: sentimentResult.sentiment,
        sectorAverageSentiment: sentimentResult.sectorAverageSentiment,
      })
    }

    return enriched
  }

  private async generateAnalysis(stocks: EnrichedStockData[]): Promise<Idea[]> {
    // Convert to prompt format
    const promptData: RealStockDataForPrompt[] = stocks.map((s) => ({
      ...s,
      newsHeadlines: s.news.slice(0, 3).map((n) => n.headline),
      newsSummaries: s.news.slice(0, 3).map((n) => (n.summary || '').slice(0, 200)),
      upcomingEarningsDate: s.upcomingEarnings
        ? s.upcomingEarnings.date.toISOString().split('T')[0]
        : null,
      epsEstimate: s.upcomingEarnings?.epsEstimate ?? null,
      revenueEstimate: s.upcomingEarnings?.revenueEstimate ?? null,
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

    const stockByTicker = new Map(stocks.map((s) => [s.ticker.toUpperCase(), s]))
    const stockByBase = new Map<string, EnrichedStockData | null>()
    for (const stock of stocks) {
      const base = getTickerBase(stock.ticker)
      const existing = stockByBase.get(base)
      if (existing === undefined) {
        stockByBase.set(base, stock)
      } else if (existing !== stock) {
        // Ambiguous base symbol across markets; disable base fallback for this symbol.
        stockByBase.set(base, null)
      }
    }
    const seenTickers = new Set<string>()

    // Map AI response to Idea interface, but only accept tickers from our candidate list.
    const ideas: Idea[] = parsed.ideas.flatMap((aiIdea) => {
      const rawTicker = String(aiIdea.ticker || '')
      const ticker = rawTicker.toUpperCase()
      const stockData = stockByTicker.get(ticker) ?? stockByBase.get(getTickerBase(ticker)) ?? null
      if (!stockData) {
        return []
      }
      if (seenTickers.has(stockData.ticker)) {
        return []
      }
      seenTickers.add(stockData.ticker)

      // Read signals from AI response, fall back to all-false
      const aiSignals = aiIdea.signals as Partial<Signals> | undefined
      const signals: Signals = {
        hiring: aiSignals?.hiring === true,
        earnings: aiSignals?.earnings === true,
        regulatory: aiSignals?.regulatory === true,
        supplyChain: aiSignals?.supplyChain === true,
      }

      return [{
        ticker: stockData.ticker,
        companyName: String(aiIdea.companyName || stockData?.companyName || ''),
        oneLiner: String(aiIdea.oneLiner || ''),
        thesis: String(aiIdea.thesis || ''),
        bearCase: String(aiIdea.bearCase || ''),
        confidenceScore: Number(aiIdea.confidenceScore) || 60,
        signals,
        riskLevel: (['safe', 'interesting', 'spicy'].includes(aiIdea.riskLevel as string)
          ? aiIdea.riskLevel
          : 'interesting') as Idea['riskLevel'],
        initialPrice: stockData.priceEur || Number(aiIdea.initialPrice) || 50,
        currency: 'EUR',
      }]
    })

    return ideas
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
      const quote = await yahooFinance.quote(ticker, {}, { validateResult: false })
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
