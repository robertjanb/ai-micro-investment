import type { IdeaProvider, Idea, IdeaDetails, PricePoint } from '../types'
import { getChatCompletion } from '@/lib/ai/claude'
import { ideaGenerationPrompt } from '@/lib/ai/prompts'
import { prisma } from '@/lib/prisma'

export class MockIdeaProvider implements IdeaProvider {
  async generateDailyIdeas(count: number): Promise<Idea[]> {
    const prompt = ideaGenerationPrompt(count)

    const response = await getChatCompletion([
      { role: 'user', content: prompt },
    ])

    let parsed: { ideas: Record<string, unknown>[] }
    try {
      parsed = JSON.parse(response)
    } catch {
      throw new Error('AI returned invalid JSON for idea generation')
    }

    if (!parsed.ideas || !Array.isArray(parsed.ideas)) {
      throw new Error('AI response missing ideas array')
    }

    const ideas: Idea[] = parsed.ideas.map(
      (idea: Record<string, unknown>) => ({
        ticker: String(idea.ticker || 'UNKN'),
        companyName: String(idea.companyName || 'Unknown'),
        oneLiner: String(idea.oneLiner || ''),
        thesis: String(idea.thesis || ''),
        bearCase: String(idea.bearCase || ''),
        confidenceScore: Number(idea.confidenceScore) || 50,
        signals: (idea.signals || {}) as Idea['signals'],
        riskLevel: (['safe', 'interesting', 'spicy'].includes(idea.riskLevel as string)
          ? idea.riskLevel
          : 'interesting') as Idea['riskLevel'],
        initialPrice: Number(idea.initialPrice) || 10,
        currency: 'EUR',
      })
    )

    return ideas
  }

  async getIdeaDetails(ticker: string): Promise<IdeaDetails> {
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
      signals: idea.signals as unknown as Idea['signals'],
      riskLevel: idea.riskLevel as Idea['riskLevel'],
      initialPrice: idea.initialPrice,
      currentPrice: idea.currentPrice,
      currency: idea.currency,
      priceHistory,
    }
  }
}
