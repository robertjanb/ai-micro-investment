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
