'use client'

import Link from 'next/link'

interface Idea {
  id: string
  ticker: string
  companyName: string
  oneLiner: string
  riskLevel: 'safe' | 'interesting' | 'spicy'
  confidenceScore: number
  currentPrice: number
  currency: string
}

interface TopIdeasCardProps {
  ideas: Idea[]
}

const riskColors: Record<string, string> = {
  safe: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  interesting: 'bg-amber-50 text-amber-700 border-amber-200',
  spicy: 'bg-rose-50 text-rose-700 border-rose-200',
}

export function TopIdeasCard({ ideas }: TopIdeasCardProps) {
  return (
    <div className="app-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
          Today&apos;s Ideas
        </span>
        <Link
          href="/ideas"
          className="text-[10px] uppercase tracking-[0.15em] text-slate-400 hover:text-slate-700"
        >
          See all &rarr;
        </Link>
      </div>

      {ideas.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-2">
          No ideas generated today.
        </p>
      ) : (
        <div className="space-y-3">
          {ideas.map((idea) => (
            <div key={idea.id} className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-slate-800">
                    {idea.ticker}
                  </span>
                  <span
                    className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${
                      riskColors[idea.riskLevel] || riskColors.safe
                    }`}
                  >
                    {idea.riskLevel}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {idea.confidenceScore}%
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {idea.oneLiner}
                </p>
              </div>
              <span className="text-xs text-slate-500 shrink-0">
                {idea.currency === 'GBP' ? '£' : '$'}
                {idea.currentPrice.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
