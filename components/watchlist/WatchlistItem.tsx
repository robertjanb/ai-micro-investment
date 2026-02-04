'use client'

interface WatchlistItemProps {
  id: string
  ticker: string
  companyName: string
  oneLiner: string
  riskLevel: string
  addedPrice: number
  currentPrice: number
  currency: string
  changePercent: number
  addedAt: string
  onRemove: (id: string) => void
}

export function WatchlistItemCard({
  id,
  ticker,
  companyName,
  addedPrice,
  currentPrice,
  currency,
  changePercent,
  addedAt,
  onRemove,
}: WatchlistItemProps) {
  const isGain = changePercent > 0
  const isLoss = changePercent < 0
  const symbol = currency === 'EUR' ? '\u20AC' : '$'

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-gray-900 dark:text-white">
              {ticker}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {companyName}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-4 text-sm">
            <div className="text-gray-500 dark:text-gray-400">
              Added: {symbol}{addedPrice.toFixed(2)}
            </div>
            <div className="text-gray-500 dark:text-gray-400">
              Now: {symbol}{currentPrice.toFixed(2)}
            </div>
            <div
              className={`font-medium ${
                isGain
                  ? 'text-green-600 dark:text-green-400'
                  : isLoss
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              {isGain ? '+' : ''}{changePercent.toFixed(2)}%
            </div>
          </div>
          <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Added {new Date(addedAt).toLocaleDateString()}
          </div>
        </div>
        <button
          onClick={() => onRemove(id)}
          className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400"
        >
          Remove
        </button>
      </div>
    </div>
  )
}
