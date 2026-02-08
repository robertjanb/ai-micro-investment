export const CONVERSATION_SYSTEM_PROMPT = `You are a senior finance consultant working as an AI investment research companion. You help users understand investment ideas and make informed decisions.

Core personality:
- Professional, direct, and measured in tone
- Never use emojis, hype language ("amazing", "incredible", "moon", "rocket"), or exclamation marks
- Push back on impulsive decisions. If a user wants to invest a significant amount, ask about their reasoning
- Admit uncertainty openly: "I don't have high confidence here" when applicable
- Explain your reasoning transparently
- Keep responses concise and substantive — no filler

Behavior guidelines:
- When discussing investment ideas, reference specific signals (hiring trends, earnings, regulatory changes, supply chain)
- Always present both the bull case and bear case for any idea
- When a user asks "should I buy this?", never give a direct yes/no. Instead, lay out the factors and let them decide
- If a user seems to be adding many items to their watchlist quickly, gently suggest they focus on understanding one or two ideas deeply
- You can discuss general investment concepts, portfolio theory, and risk management
- Never claim to predict the market or guarantee returns
- All prices and ideas are simulated for educational purposes — remind users of this if they seem to treat them as real

You have access to today's investment ideas. When discussing them, reference the specific data (ticker, confidence score, signals) rather than speaking in generalities.`

export function ideaGenerationPrompt(count: number): string {
  return `Generate ${count} fictional but plausible investment ideas. Each idea should be for a realistic-sounding company (can be inspired by real sectors but must be fictional).

Return ONLY valid JSON in this exact format, with no additional text:

{
  "ideas": [
    {
      "ticker": "ABCD",
      "companyName": "Company Name Inc.",
      "oneLiner": "One sentence describing the investment thesis",
      "thesis": "2-3 paragraph detailed bull case for this investment",
      "bearCase": "1-2 paragraph devil's advocate case — why this could fail",
      "confidenceScore": 72,
      "signals": {
        "hiring": true,
        "earnings": true,
        "regulatory": false,
        "supplyChain": true
      },
      "riskLevel": "interesting",
      "initialPrice": 45.20
    }
  ]
}

Requirements:
- Tickers: 3-5 uppercase letters, fictional
- Confidence scores: 40-90 range, with most between 55-75
- Risk levels: "safe", "interesting", or "spicy"
- Prices: realistic EUR amounts between 5 and 500
- Signals: at least 2 should be true per idea, but not all 4
- Mix of sectors: tech, biotech, energy, consumer, industrial, etc.
- Each idea should be distinct in sector and thesis
- Theses should reference specific (fictional) catalysts: new product launches, regulatory approvals, market expansion, etc.
- Bear cases should be genuinely concerning, not token objections`
}

export function contextualizeIdeasPrompt(
  ideas: Array<{ ticker: string; companyName: string; oneLiner: string }>
): string {
  const ideaList = ideas
    .map((i) => `- ${i.ticker} (${i.companyName}): ${i.oneLiner}`)
    .join('\n')

  return `\n\nToday's investment ideas for reference:\n${ideaList}\n\nIf the user asks about any of these, provide detailed analysis based on the idea data.`
}

export interface PortfolioHolding {
  ticker: string
  companyName: string | null
  quantity: number
  purchasePrice: number
  currentPrice: number
  gainLoss: number
  gainLossPercent: number
}

export function portfolioAnalysisPrompt(
  holdings: PortfolioHolding[],
  ideas: Array<{ ticker: string; companyName: string; signals: { hiring: boolean; earnings: boolean; regulatory: boolean; supplyChain: boolean }; confidenceScore: number }>
): string {
  const holdingsText = holdings
    .map((h) => {
      const name = h.companyName || h.ticker
      const direction = h.gainLossPercent >= 0 ? '+' : ''
      return `- ${h.ticker} (${name}): ${h.quantity} shares @ €${h.purchasePrice.toFixed(2)}, now €${h.currentPrice.toFixed(2)} (${direction}${h.gainLossPercent.toFixed(1)}%)`
    })
    .join('\n')

  const ideasText = ideas
    .map((i) => {
      const signals = Object.entries(i.signals)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join(', ')
      return `- ${i.ticker} (${i.companyName}): confidence ${i.confidenceScore}%, signals: ${signals || 'none'}`
    })
    .join('\n')

  return `Analyze the following portfolio and today's ideas to generate buy/sell/hold recommendations.

Current Holdings:
${holdingsText || 'No current holdings'}

Today's Ideas:
${ideasText || 'No new ideas today'}

Generate recommendations as JSON in this exact format:
{
  "recommendations": [
    {
      "ticker": "ABCD",
      "action": "hold",
      "reasoning": "Brief explanation of the recommendation",
      "confidence": 72
    }
  ]
}

Guidelines:
- For each holding, provide a hold/sell recommendation based on performance and market conditions
- If holdings are significantly up (>20%), consider suggesting partial profit-taking
- If holdings are significantly down (>15%), evaluate whether the thesis still holds
- From today's ideas, suggest at most 2 buy candidates that aren't already held
- Only suggest buys for ideas with confidence >= 65%
- Confidence scores should be 50-90
- Keep reasoning concise but substantive
- Return ONLY valid JSON, no additional text`
}

export interface RealStockDataForPrompt {
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
  newsHeadlines: string[]
  newsSummaries: string[]
  upcomingEarningsDate: string | null
  newsSentiment: number | null
  totalRevenue: number | null
  profitMargins: number | null
  totalDebt: number | null
  currentRatio: number | null
  epsEstimate: number | null
  revenueEstimate: number | null
  sectorAverageSentiment: number | null
}

function formatLargeNumber(n: number | null): string {
  if (n === null) return 'N/A'
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`
  return `$${n.toFixed(0)}`
}

function formatSentimentLabel(value: number | null): string {
  if (value === null) return 'Unknown'
  if (value > 0.2) return 'Positive'
  if (value < -0.2) return 'Negative'
  return 'Neutral'
}

export function realStockAnalysisPrompt(stocks: RealStockDataForPrompt[]): string {
  const stockDescriptions = stocks.map((s) => {
    const pricePosition = ((s.price - s.fiftyTwoWeekLow) / (s.fiftyTwoWeekHigh - s.fiftyTwoWeekLow) * 100).toFixed(0)
    const pe = s.peRatio ? s.peRatio.toFixed(1) : 'N/A'
    const dividend = s.dividendYield ? `${(s.dividendYield * 100).toFixed(2)}%` : 'None'
    const sentimentLabel = formatSentimentLabel(s.newsSentiment)
    const sectorSentimentLabel = formatSentimentLabel(s.sectorAverageSentiment)

    const margin = s.profitMargins !== null ? `${(s.profitMargins * 100).toFixed(1)}%` : 'N/A'

    // Build news section with headlines + summaries
    const newsSection = s.newsSummaries.length > 0
      ? s.newsSummaries.map((summary, i) => {
          const headline = s.newsHeadlines[i] || ''
          return `- ${headline}${summary ? ` — ${summary}` : ''}`
        }).join('\n')
      : '- No recent news'

    // Build earnings estimate section
    const earningsEstimates = (s.epsEstimate !== null || s.revenueEstimate !== null)
      ? `\n**Earnings Estimates${s.upcomingEarningsDate ? ` (${s.upcomingEarningsDate})` : ''}:**${s.epsEstimate !== null ? `\n- EPS estimate: $${s.epsEstimate.toFixed(2)}` : ''}${s.revenueEstimate !== null ? `\n- Revenue estimate: ${formatLargeNumber(s.revenueEstimate)}` : ''}`
      : (s.upcomingEarningsDate ? `\n**Upcoming Earnings:** ${s.upcomingEarningsDate}` : '')

    return `
## ${s.ticker} - ${s.companyName}
Exchange: ${s.exchange}
Sector: ${s.sector} | Industry: ${s.industry}

**Price Data:**
- Current Price: €${s.priceEur.toFixed(2)} (${s.currency} ${s.price.toFixed(2)})
- Market Cap: €${(s.marketCap / 1e9).toFixed(2)}B
- P/E Ratio: ${pe}
- Dividend Yield: ${dividend}
- 52-Week Range: ${s.currency} ${s.fiftyTwoWeekLow.toFixed(2)} - ${s.fiftyTwoWeekHigh.toFixed(2)}
- Position in 52-Week Range: ${pricePosition}%
- Recent Change: ${s.recentChange >= 0 ? '+' : ''}${s.recentChange.toFixed(2)}%

**Financials:**
- Revenue: ${formatLargeNumber(s.totalRevenue)}
- Profit Margin: ${margin}
- Total Debt: ${formatLargeNumber(s.totalDebt)}
- Current Ratio: ${s.currentRatio !== null ? s.currentRatio.toFixed(2) : 'N/A'}

**Company Description:**
${s.description.slice(0, 500)}${s.description.length > 500 ? '...' : ''}

**Recent News:**
${newsSection}

**Sentiment:** ${sentimentLabel} (sector avg: ${sectorSentimentLabel})
${earningsEstimates}
`
  }).join('\n---\n')

  return `You are a stock analyst creating investment ideas based on REAL market data. Analyze these stocks and create compelling investment theses.

IMPORTANT: These are REAL companies with REAL data. Your analysis should:
- Reference specific fundamentals (P/E, market cap, revenue, margins, debt)
- Mention actual sector dynamics and competitive positioning
- Note any relevant news or upcoming catalysts
- Be factual and grounded in the data provided

${stockDescriptions}

For each stock, create an investment analysis. Return ONLY valid JSON in this exact format:

{
  "ideas": [
    {
      "ticker": "EXACT_TICKER",
      "companyName": "Full Company Name",
      "oneLiner": "One compelling sentence summarizing the investment opportunity",
      "thesis": "2-3 paragraphs explaining the bull case. Reference specific data points: valuation metrics, market position, catalysts, sector trends. Be specific and factual.",
      "bearCase": "1-2 paragraphs of genuine risks: valuation concerns, competitive threats, macro headwinds, specific challenges facing the company or sector.",
      "confidenceScore": 65,
      "riskLevel": "interesting",
      "signals": {
        "hiring": false,
        "earnings": false,
        "regulatory": false,
        "supplyChain": false
      }
    }
  ]
}

Guidelines:
- Confidence scores: 50-85 range based on data quality and clarity of thesis
  - 50-60: Speculative, limited data, uncertain thesis
  - 60-70: Reasonable thesis with some risks
  - 70-85: Strong thesis with good fundamentals support
- Risk levels:
  - "safe": Large-cap, stable dividend payers, lower volatility
  - "interesting": Mid-cap growth, sector leaders, moderate risk/reward
  - "spicy": Small-cap, high growth, volatile, binary outcomes
- Use the EXACT ticker symbol provided (e.g., "ASML.AS" not "ASML")
- Each thesis should be distinct and reference the specific data provided
- Bear cases should identify real, material risks - not token objections
- Signal classification (set each based on the actual news and data context, not just keyword presence):
  - signals.hiring: true if evidence of workforce expansion, strong growth, or beat expectations
  - signals.earnings: true if earnings are upcoming within 14 days or recent results are notable
  - signals.regulatory: true if regulatory events (approvals, investigations, compliance) affect the stock
  - signals.supplyChain: true if supply chain, logistics, or production factors are relevant`
}

export function contextualizePortfolioPrompt(
  holdings: PortfolioHolding[]
): string {
  if (holdings.length === 0) {
    return '\n\nThe user has no current portfolio holdings.'
  }

  const totalValue = holdings.reduce((sum, h) => sum + h.quantity * h.currentPrice, 0)
  const totalCost = holdings.reduce((sum, h) => sum + h.quantity * h.purchasePrice, 0)
  const totalReturn = totalValue - totalCost
  const totalReturnPercent = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0

  const holdingsText = holdings
    .map((h) => {
      const name = h.companyName || h.ticker
      const direction = h.gainLossPercent >= 0 ? '+' : ''
      return `- ${h.ticker} (${name}): ${h.quantity} shares, ${direction}${h.gainLossPercent.toFixed(1)}%`
    })
    .join('\n')

  const direction = totalReturnPercent >= 0 ? '+' : ''

  return `\n\nUser's Portfolio (${holdings.length} holdings, ${direction}${totalReturnPercent.toFixed(1)}% overall):
${holdingsText}

When the user asks about their portfolio or specific holdings, reference this data. Provide personalized advice based on their actual positions.`
}
