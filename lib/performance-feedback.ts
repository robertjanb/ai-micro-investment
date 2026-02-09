import { prisma } from '@/lib/prisma'

export interface PerformanceSummary {
  totalEvaluated: number
  overallWinRate: number | null
  overallAvgReturn: number | null
  byAction: ActionSummary[]
  byRiskLevel: RiskSummary[]
  recentMistakes: RecentOutcome[]
  recentSuccesses: RecentOutcome[]
}

interface ActionSummary {
  action: string
  count: number
  winRate: number
  avgReturn: number
}

interface RiskSummary {
  riskLevel: string
  count: number
  winRate: number
  avgReturn: number
}

interface RecentOutcome {
  ticker: string
  action: string
  confidence: number
  returnPct: number
  isWin: boolean
  horizonDays: number
}

/**
 * Fetch aggregated performance data for a user to feed back into AI prompts.
 * Uses the 7-day horizon as the primary evaluation window.
 */
export async function getPerformanceFeedback(userId: string): Promise<PerformanceSummary | null> {
  const evaluations = await prisma.recommendationEvaluation.findMany({
    where: {
      horizonDays: 7,
      dataQuality: 'ok',
      returnPct: { not: null },
      isWin: { not: null },
      snapshot: { userId },
    },
    select: {
      returnPct: true,
      isWin: true,
      horizonDays: true,
      snapshot: {
        select: {
          ticker: true,
          action: true,
          confidence: true,
          riskLevel: true,
        },
      },
    },
    orderBy: { evaluatedAt: 'desc' },
  })

  if (evaluations.length < 3) {
    return null // Not enough data to learn from
  }

  // Overall stats
  const wins = evaluations.filter((e) => e.isWin).length
  const totalReturn = evaluations.reduce((sum, e) => sum + (e.returnPct ?? 0), 0)
  const overallWinRate = Math.round((wins / evaluations.length) * 100)
  const overallAvgReturn = Math.round((totalReturn / evaluations.length) * 100) / 100

  // By action
  const actionMap = new Map<string, { count: number; wins: number; totalReturn: number }>()
  for (const e of evaluations) {
    const key = e.snapshot.action
    const current = actionMap.get(key) ?? { count: 0, wins: 0, totalReturn: 0 }
    current.count += 1
    if (e.isWin) current.wins += 1
    current.totalReturn += e.returnPct ?? 0
    actionMap.set(key, current)
  }

  const byAction: ActionSummary[] = Array.from(actionMap.entries())
    .map(([action, stats]) => ({
      action,
      count: stats.count,
      winRate: Math.round((stats.wins / stats.count) * 100),
      avgReturn: Math.round((stats.totalReturn / stats.count) * 100) / 100,
    }))
    .sort((a, b) => b.count - a.count)

  // By risk level
  const riskMap = new Map<string, { count: number; wins: number; totalReturn: number }>()
  for (const e of evaluations) {
    const key = e.snapshot.riskLevel ?? 'unknown'
    const current = riskMap.get(key) ?? { count: 0, wins: 0, totalReturn: 0 }
    current.count += 1
    if (e.isWin) current.wins += 1
    current.totalReturn += e.returnPct ?? 0
    riskMap.set(key, current)
  }

  const byRiskLevel: RiskSummary[] = Array.from(riskMap.entries())
    .map(([riskLevel, stats]) => ({
      riskLevel,
      count: stats.count,
      winRate: Math.round((stats.wins / stats.count) * 100),
      avgReturn: Math.round((stats.totalReturn / stats.count) * 100) / 100,
    }))
    .sort((a, b) => b.count - a.count)

  // Recent mistakes (last 5 losses)
  const recentMistakes: RecentOutcome[] = evaluations
    .filter((e) => !e.isWin)
    .slice(0, 5)
    .map((e) => ({
      ticker: e.snapshot.ticker,
      action: e.snapshot.action,
      confidence: e.snapshot.confidence,
      returnPct: Math.round((e.returnPct ?? 0) * 100) / 100,
      isWin: false,
      horizonDays: e.horizonDays,
    }))

  // Recent successes (last 5 wins)
  const recentSuccesses: RecentOutcome[] = evaluations
    .filter((e) => e.isWin)
    .slice(0, 5)
    .map((e) => ({
      ticker: e.snapshot.ticker,
      action: e.snapshot.action,
      confidence: e.snapshot.confidence,
      returnPct: Math.round((e.returnPct ?? 0) * 100) / 100,
      isWin: true,
      horizonDays: e.horizonDays,
    }))

  return {
    totalEvaluated: evaluations.length,
    overallWinRate,
    overallAvgReturn,
    byAction,
    byRiskLevel,
    recentMistakes,
    recentSuccesses,
  }
}
