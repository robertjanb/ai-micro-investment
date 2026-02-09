'use client'

import Link from 'next/link'

interface Recommendation {
  id: string
  ticker: string
  action: 'buy' | 'sell' | 'hold'
  reasoning: string
  confidence: number
}

interface Outcome {
  ticker: string
  changePercent: number
}

interface ActivityFeedProps {
  recommendations: Recommendation[]
  hitRate: number | null
  recentOutcomes: Outcome[]
}

const actionColors: Record<string, string> = {
  buy: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  sell: 'bg-rose-50 text-rose-700 border-rose-200',
  hold: 'bg-amber-50 text-amber-700 border-amber-200',
}

export function ActivityFeed({ recommendations, hitRate, recentOutcomes }: ActivityFeedProps) {
  const hasRecommendations = recommendations.length > 0
  const hasOutcomes = recentOutcomes.length > 0

  if (!hasRecommendations && !hasOutcomes && hitRate === null) {
    return (
      <div className="app-card p-5">
        <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
          Activity
        </span>
        <p className="text-xs text-slate-400 text-center py-4">
          No activity yet. Start building your portfolio to see recommendations.
        </p>
      </div>
    )
  }

  return (
    <div className="app-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
          Activity
        </span>
      </div>

      {hasRecommendations && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
              Recommendations
            </span>
            <Link
              href="/portfolio"
              className="text-[10px] uppercase tracking-[0.15em] text-slate-400 hover:text-slate-700"
            >
              See all &rarr;
            </Link>
          </div>
          {recommendations.map((rec) => (
            <div key={rec.id} className="flex items-start gap-2">
              <span
                className={`shrink-0 text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full border ${
                  actionColors[rec.action]
                }`}
              >
                {rec.action}
              </span>
              <span className="font-mono text-xs font-bold text-slate-700 shrink-0">
                {rec.ticker}
              </span>
              <span className="text-xs text-slate-500 truncate">
                {rec.reasoning}
              </span>
            </div>
          ))}
        </div>
      )}

      {(hasOutcomes || hitRate !== null) && (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
              Track Record
            </span>
            <Link
              href="/performance"
              className="text-[10px] uppercase tracking-[0.15em] text-slate-400 hover:text-slate-700"
            >
              See all &rarr;
            </Link>
          </div>
          {hitRate !== null && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                Hit rate
              </span>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                  hitRate >= 50
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {hitRate.toFixed(0)}%
              </span>
            </div>
          )}
          {hasOutcomes && (
            <div className="flex flex-wrap gap-2">
              {recentOutcomes.map((o) => {
                const positive = o.changePercent >= 0
                return (
                  <div key={o.ticker} className="app-pill flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-slate-700">
                      {o.ticker}
                    </span>
                    <span
                      className={`text-xs font-medium ${
                        positive ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {positive ? '+' : ''}
                      {o.changePercent.toFixed(1)}%
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
