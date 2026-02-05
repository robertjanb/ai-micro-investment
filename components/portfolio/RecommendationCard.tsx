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
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-800',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
    label: 'Buy',
  },
  sell: {
    bg: 'bg-rose-50 dark:bg-rose-900/20',
    border: 'border-rose-200 dark:border-rose-800',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300',
    label: 'Sell',
  },
  hold: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
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
    <div className={`${styles.bg} border ${styles.border} rounded-lg p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-full ${styles.badge}`}>
              {styles.label}
            </span>
            <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
              {ticker}
            </span>
            {companyName && (
              <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {companyName}
              </span>
            )}
            {isNewBuy && (
              <span className="text-[10px] uppercase tracking-[0.15em] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                New
              </span>
            )}
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">{reasoning}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Confidence</div>
          <div className="font-mono text-lg font-semibold text-gray-900 dark:text-white">
            {confidence}%
          </div>
        </div>
      </div>
    </div>
  )
}
