'use client'

interface NewsItemData {
  ticker: string
  headline: string
  source: string
  datetime: string
  url: string
}

interface MarketNewsProps {
  news: NewsItemData[]
}

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay === 1) return '1d ago'
  return `${diffDay}d ago`
}

export function MarketNews({ news }: MarketNewsProps) {
  if (news.length === 0) {
    return (
      <div className="app-card p-5">
        <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
          Market News
        </span>
        <p className="text-xs text-slate-400 text-center py-4">
          No recent news for your tickers.
        </p>
      </div>
    )
  }

  return (
    <div className="app-card p-5 space-y-3">
      <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
        Market News
      </span>
      <div className="space-y-2">
        {news.map((item, i) => (
          <a
            key={`${item.ticker}-${i}`}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-2 group py-1"
          >
            <span className="shrink-0 font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
              {item.ticker}
            </span>
            <span className="text-xs text-slate-700 group-hover:text-slate-900 line-clamp-1 flex-1">
              {item.headline}
            </span>
            <span className="shrink-0 text-[10px] text-slate-400 whitespace-nowrap">
              {item.source} · {relativeTime(item.datetime)}
            </span>
          </a>
        ))}
      </div>
    </div>
  )
}
