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

export interface RecommendationProvider {
  generateRecommendations(
    holdings: HoldingData[],
    ideas: Array<{ ticker: string; companyName: string; signals: Signals; confidenceScore: number }>
  ): Promise<RecommendationData[]>
}
