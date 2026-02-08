'use client'

import { DonutChart } from '@/components/ui/DonutChart'

const PALETTE = [
  '#0d9488', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#14b8a6',
]

interface HoldingAllocation {
  ticker: string
  value: number
}

interface PortfolioSummaryProps {
  totalValue: number
  totalCost: number
  totalGainLoss: number
  totalGainLossPercent: number
  holdingCount: number
  holdings?: HoldingAllocation[]
}

export function PortfolioSummary({
  totalValue,
  totalCost,
  totalGainLoss,
  totalGainLossPercent,
  holdingCount,
  holdings,
}: PortfolioSummaryProps) {
  const isGain = totalGainLoss >= 0

  return (
    <div className="app-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xs uppercase tracking-[0.25em] text-slate-500">
            Portfolio Summary
          </h2>
          <div className="text-sm text-slate-600">
            Tracking {holdingCount} holdings
          </div>
        </div>
        <span
          className={`text-xs uppercase tracking-[0.2em] px-3 py-1 rounded-full border ${
            isGain
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {isGain ? 'Net gain' : 'Net loss'}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Holdings</div>
          <div className="text-lg font-semibold text-slate-900">
            {holdingCount}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Total Cost</div>
          <div className="text-lg font-semibold text-slate-900">
            &euro;{totalCost.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Current Value</div>
          <div className="text-lg font-semibold text-slate-900">
            &euro;{totalValue.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Total Return</div>
          <div
            className={`text-lg font-semibold ${
              isGain ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {isGain ? '+' : ''}&euro;{totalGainLoss.toFixed(2)} ({isGain ? '+' : ''}
            {totalGainLossPercent.toFixed(2)}%)
          </div>
        </div>
      </div>
      {holdings && holdings.length > 1 && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-3 text-center">
            Allocation
          </div>
          <DonutChart
            segments={holdings.map((h, i) => ({
              label: h.ticker,
              value: h.value,
              color: PALETTE[i % PALETTE.length],
            }))}
          />
        </div>
      )}
    </div>
  )
}
