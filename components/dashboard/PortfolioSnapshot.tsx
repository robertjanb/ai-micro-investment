'use client'

import Link from 'next/link'

interface Mover {
  ticker: string
  gainLossPercent: number
  currentPrice: number
  currency: string
}

interface Summary {
  totalValue: number
  totalCost: number
  totalGainLoss: number
  totalGainLossPercent: number
  holdingCount: number
}

interface PortfolioSnapshotProps {
  summary: Summary
  topMovers: Mover[]
}

export function PortfolioSnapshot({ summary, topMovers }: PortfolioSnapshotProps) {
  const isPositive = summary.totalGainLoss >= 0

  return (
    <div className="app-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
          Portfolio
        </span>
        <Link
          href="/portfolio"
          className="text-[10px] uppercase tracking-[0.15em] text-slate-400 hover:text-slate-700"
        >
          See all &rarr;
        </Link>
      </div>

      <div>
        <span className="font-mono text-2xl font-bold text-slate-900">
          €{summary.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span
          className={`ml-2 inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
            isPositive
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          {isPositive ? '+' : ''}
          {summary.totalGainLossPercent.toFixed(1)}%
        </span>
      </div>

      {topMovers.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
            Top movers
          </span>
          {topMovers.map((m) => {
            const positive = m.gainLossPercent >= 0
            return (
              <div key={m.ticker} className="flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-slate-700">
                  {m.ticker}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">
                    {m.currency === 'GBP' || m.currency === 'GBp' ? '£' : m.currency === 'USD' ? '$' : '€'}
                    {m.currentPrice.toFixed(2)}
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      positive ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {positive ? '+' : ''}
                    {m.gainLossPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {summary.holdingCount === 0 && (
        <p className="text-xs text-slate-400 text-center py-2">
          No holdings yet.{' '}
          <Link href="/ideas" className="text-slate-600 hover:underline">
            Browse ideas
          </Link>
        </p>
      )}
    </div>
  )
}
