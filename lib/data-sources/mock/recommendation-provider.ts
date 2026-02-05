import type { RecommendationProvider, RecommendationData, HoldingData, Signals } from '../types'

export class MockRecommendationProvider implements RecommendationProvider {
  async generateRecommendations(
    holdings: HoldingData[],
    ideas: Array<{ ticker: string; companyName: string; signals: Signals; confidenceScore: number }>
  ): Promise<RecommendationData[]> {
    const recommendations: RecommendationData[] = []

    // Generate recommendations for existing holdings
    for (const holding of holdings) {
      const action = this.determineAction(holding)
      recommendations.push({
        ticker: holding.ticker,
        action,
        reasoning: this.generateReasoning(holding, action),
        confidence: Math.floor(Math.random() * 30) + 55, // 55-85
      })
    }

    // Suggest potential buys from today's ideas (not already held)
    const heldTickers = new Set(holdings.map((h) => h.ticker))
    const potentialBuys = ideas
      .filter((idea) => !heldTickers.has(idea.ticker))
      .filter((idea) => idea.confidenceScore >= 65)
      .slice(0, 2)

    for (const idea of potentialBuys) {
      recommendations.push({
        ticker: idea.ticker,
        action: 'buy',
        reasoning: this.generateBuyReasoning(idea),
        confidence: Math.min(idea.confidenceScore, 80),
      })
    }

    return recommendations
  }

  private determineAction(holding: HoldingData): 'buy' | 'sell' | 'hold' {
    const { gainLossPercent } = holding

    // Simple mock logic based on gain/loss
    if (gainLossPercent > 20) {
      return Math.random() > 0.5 ? 'sell' : 'hold' // Take profits sometimes
    }
    if (gainLossPercent < -15) {
      return Math.random() > 0.6 ? 'sell' : 'hold' // Cut losses sometimes
    }
    if (gainLossPercent > 5 && gainLossPercent <= 20) {
      return Math.random() > 0.7 ? 'buy' : 'hold' // Add to winners sometimes
    }
    return 'hold'
  }

  private generateReasoning(holding: HoldingData, action: 'buy' | 'sell' | 'hold'): string {
    const { ticker, gainLossPercent, companyName } = holding
    const name = companyName || ticker

    if (action === 'sell') {
      if (gainLossPercent > 15) {
        return `${name} has appreciated ${gainLossPercent.toFixed(1)}% since purchase. Consider taking partial profits to lock in gains and reduce concentration risk.`
      }
      return `${name} is down ${Math.abs(gainLossPercent).toFixed(1)}%. The position may warrant review to determine if the original thesis still holds.`
    }

    if (action === 'buy') {
      return `${name} continues to show momentum with positive fundamentals. Consider adding to the position while maintaining appropriate position sizing.`
    }

    // hold
    if (gainLossPercent > 0) {
      return `${name} is performing well with ${gainLossPercent.toFixed(1)}% gains. The current trend supports maintaining the position.`
    }
    return `${name} is down ${Math.abs(gainLossPercent).toFixed(1)}% but the underlying thesis remains intact. Patience is warranted.`
  }

  private generateBuyReasoning(idea: { ticker: string; companyName: string; signals: Signals; confidenceScore: number }): string {
    const signalCount = Object.values(idea.signals).filter(Boolean).length
    const signalText = signalCount >= 3 ? 'strong signal alignment' : 'positive signals'
    return `${idea.companyName} (${idea.ticker}) shows ${signalText} with a ${idea.confidenceScore}% confidence score. Consider initiating a position with appropriate sizing.`
  }
}
