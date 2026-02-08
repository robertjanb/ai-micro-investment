'use client'

interface TickerItem {
  ticker: string
  price: number
  changePercent: number
  currency: string
}

interface TickerTapeProps {
  tickers: TickerItem[]
}

export function TickerTape({ tickers }: TickerTapeProps) {
  if (tickers.length === 0) return null

  return (
    <div className="overflow-x-auto lg:overflow-visible -mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
      <div className="flex gap-2 lg:flex-wrap min-w-max lg:min-w-0">
        {tickers.map((t) => {
          const isPositive = t.changePercent >= 0
          return (
            <div
              key={t.ticker}
              className="app-pill flex items-center gap-2 shrink-0"
            >
              <span className="font-mono text-xs font-bold text-slate-800">
                {t.ticker}
              </span>
              <span className="text-xs text-slate-500">
                {t.currency === 'GBP' ? '£' : '$'}
                {t.price.toFixed(2)}
              </span>
              <span
                className={`text-xs font-medium ${
                  isPositive ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {isPositive ? '+' : ''}
                {t.changePercent.toFixed(1)}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
