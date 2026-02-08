import type { RecommendationProvider, RecommendationData, HoldingData, Signals } from '../types'
import { getChatCompletion } from '@/lib/ai/claude'
import { portfolioAnalysisPrompt, type PortfolioHolding } from '@/lib/ai/prompts'

export class RealRecommendationProvider implements RecommendationProvider {
  async generateRecommendations(
    holdings: HoldingData[],
    ideas: Array<{ ticker: string; companyName: string; signals: Signals; confidenceScore: number }>
  ): Promise<RecommendationData[]> {
    if (holdings.length === 0 && ideas.length === 0) {
      return []
    }

    const portfolioHoldings: PortfolioHolding[] = holdings.map((h) => ({
      ticker: h.ticker,
      companyName: h.companyName,
      quantity: h.quantity,
      purchasePrice: h.purchasePrice,
      currentPrice: h.currentPrice,
      gainLoss: h.gainLoss,
      gainLossPercent: h.gainLossPercent,
    }))

    const prompt = portfolioAnalysisPrompt(portfolioHoldings, ideas)

    const response = await getChatCompletion([
      { role: 'user', content: prompt },
    ])

    let parsed: { recommendations: Array<Record<string, unknown>> }
    try {
      parsed = JSON.parse(response)
    } catch {
      throw new Error('AI returned invalid JSON for portfolio recommendations')
    }

    if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
      throw new Error('AI response missing recommendations array')
    }

    return parsed.recommendations.map((rec) => ({
      ticker: String(rec.ticker || ''),
      action: (['buy', 'sell', 'hold'].includes(rec.action as string)
        ? rec.action
        : 'hold') as 'buy' | 'sell' | 'hold',
      reasoning: String(rec.reasoning || ''),
      confidence: Number(rec.confidence) || 60,
    }))
  }
}
