'use client'

interface RecommendationCardProps {
  ticker: string
  action: 'buy' | 'sell' | 'hold'
  reasoning: string
  confidence: number
  holdingId: string | null
  companyName?: string | null
}

const ACTION_STYLES = {
  buy: {
    bg: 'bg-emerald-50',
    ring: 'ring-1 ring-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700',
    label: 'Buy',
  },
  sell: {
    bg: 'bg-rose-50',
    ring: 'ring-1 ring-rose-200',
    badge: 'bg-rose-100 text-rose-700',
    label: 'Sell',
  },
  hold: {
    bg: 'bg-amber-50',
    ring: 'ring-1 ring-amber-200',
    badge: 'bg-amber-100 text-amber-700',
    label: 'Hold',
  },
}

export function RecommendationCard({
  ticker,
  action,
  reasoning,
  confidence,
  holdingId,
  companyName,
}: RecommendationCardProps) {
  const styles = ACTION_STYLES[action]
  const isNewBuy = action === 'buy' && !holdingId

  return (
    <div className={`app-card p-4 ${styles.bg} ${styles.ring}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-full ${styles.badge}`}>
              {styles.label}
            </span>
            <span className="font-mono text-sm font-semibold text-slate-900">
              {ticker}
            </span>
            {companyName && (
              <span className="text-sm text-slate-500 truncate">
                {companyName}
              </span>
            )}
            {isNewBuy && (
              <span className="text-[10px] uppercase tracking-[0.15em] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                New
              </span>
            )}
          </div>
          <p className="text-sm text-slate-700">{reasoning}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-slate-500 mb-1">Confidence</div>
          <div className="font-mono text-lg font-semibold text-slate-900">
            {confidence}%
          </div>
        </div>
      </div>
    </div>
  )
}
