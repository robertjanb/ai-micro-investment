export interface Signals {
  hiring: boolean
  earnings: boolean
  regulatory: boolean
  supplyChain: boolean
}

export interface Idea {
  ticker: string
  companyName: string
  oneLiner: string
  thesis: string
  bearCase: string
  confidenceScore: number
  signals: Signals
  riskLevel: 'safe' | 'interesting' | 'spicy'
  initialPrice: number
  currency: string
}

export interface IdeaDetails extends Idea {
  priceHistory: PricePoint[]
  currentPrice: number
}

export interface PricePoint {
  price: number
  timestamp: Date
}

export interface IdeaProvider {
  generateDailyIdeas(count: number): Promise<Idea[]>
  getIdeaDetails(ticker: string): Promise<IdeaDetails>
}

export interface PriceProvider {
  getCurrentPrice(ticker: string): Promise<number>
  getPriceHistory(ticker: string, days: number): Promise<PricePoint[]>
  updatePrices(tickers: string[]): Promise<void>
}

export interface SignalProvider {
  getSignals(ticker: string): Promise<Signals>
}

export interface HoldingData {
  id: string
  ticker: string
  companyName: string | null
  quantity: number
  purchasePrice: number
  currentPrice: number
  purchaseDate: Date
  gainLoss: number
  gainLossPercent: number
}

export interface RecommendationData {
  ticker: string
  action: 'buy' | 'sell' | 'hold'
  reasoning: string
  confidence: number
}

export interface PerformanceFeedback {
  totalEvaluated: number
  overallWinRate: number | null
  overallAvgReturn: number | null
  byAction: Array<{ action: string; count: number; winRate: number; avgReturn: number }>
  byRiskLevel: Array<{ riskLevel: string; count: number; winRate: number; avgReturn: number }>
  recentMistakes: Array<{ ticker: string; action: string; confidence: number; returnPct: number }>
  recentSuccesses: Array<{ ticker: string; action: string; confidence: number; returnPct: number }>
}

export interface RecommendationProvider {
  generateRecommendations(
    holdings: HoldingData[],
    ideas: Array<{ ticker: string; companyName: string; signals: Signals; confidenceScore: number }>,
    performanceFeedback?: PerformanceFeedback | null
  ): Promise<RecommendationData[]>
}

// Real stock data types for RealIdeaProvider
export interface RealStockData {
  ticker: string
  companyName: string
  price: number
  priceEur: number
  currency: string
  marketCap: number
  peRatio: number | null
  fiftyTwoWeekLow: number
  fiftyTwoWeekHigh: number
  sector: string
  industry: string
  exchange: string
  recentChange: number
  dividendYield: number | null
  description: string
  totalRevenue: number | null
  profitMargins: number | null
  totalDebt: number | null
  currentRatio: number | null
}

export interface NewsItem {
  headline: string
  summary: string
  source: string
  datetime: Date
  url: string
  sentiment?: 'positive' | 'negative' | 'neutral'
}

export interface EarningsEvent {
  ticker: string
  date: Date
  epsEstimate: number | null
  epsActual: number | null
  revenueEstimate: number | null
  revenueActual: number | null
}

export interface EnrichedStockData extends RealStockData {
  news: NewsItem[]
  upcomingEarnings: EarningsEvent | null
  newsSentiment: number | null // -1 to 1 scale
  sectorAverageSentiment: number | null
}
