'use client'

interface PortfolioSummaryProps {
  totalValue: number
  totalCost: number
  totalGainLoss: number
  totalGainLossPercent: number
  holdingCount: number
}

export function PortfolioSummary({
  totalValue,
  totalCost,
  totalGainLoss,
  totalGainLossPercent,
  holdingCount,
}: PortfolioSummaryProps) {
  const isGain = totalGainLoss >= 0

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
        Portfolio Summary
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Holdings</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {holdingCount}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Total Cost</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            &euro;{totalCost.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Current Value</div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            &euro;{totalValue.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Total Return</div>
          <div
            className={`text-lg font-semibold ${
              isGain
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {isGain ? '+' : ''}&euro;{totalGainLoss.toFixed(2)} ({isGain ? '+' : ''}
            {totalGainLossPercent.toFixed(2)}%)
          </div>
        </div>
      </div>
    </div>
  )
}
