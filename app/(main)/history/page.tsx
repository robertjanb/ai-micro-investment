'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { AreaChart } from '@/components/ui/AreaChart'

interface HistoryIdea {
  id: string
  ticker: string
  companyName: string
  oneLiner: string
  riskLevel: string
  confidenceScore: number
  initialPrice: number
  currentPrice: number
  currency: string
  changePercent: number
  hypotheticalReturn: number
  priceHistory: number[]
  generatedDate: string
}

type Filter = 'all' | 'gains' | 'losses'

interface DayGroup {
  date: string
  ideas: HistoryIdea[]
  avgChange: number
  bestTicker: string
  worstTicker: string
}

export default function HistoryPage() {
  const [ideas, setIdeas] = useState<HistoryIdea[]>([])
  const [hitRate, setHitRate] = useState<number | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)

  const loadHistory = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })
      if (filter !== 'all') params.set('filter', filter)

      const res = await fetch(`/api/history?${params}`)
      if (res.ok) {
        const data = await res.json()
        setIdeas(data.ideas)
        setHitRate(data.hitRate)
        setTotalPages(data.pagination.totalPages)
      }
    } catch (error) {
      console.error('Failed to load history:', error)
    } finally {
      setIsLoading(false)
    }
  }, [page, filter])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  useEffect(() => {
    setPage(1)
  }, [filter])

  const dayGroups = useMemo((): DayGroup[] => {
    const groups = new Map<string, HistoryIdea[]>()
    for (const idea of ideas) {
      const dateKey = new Date(idea.generatedDate).toLocaleDateString()
      const arr = groups.get(dateKey) ?? []
      arr.push(idea)
      groups.set(dateKey, arr)
    }

    return Array.from(groups.entries()).map(([date, dayIdeas]) => {
      const avgChange =
        Math.round(
          (dayIdeas.reduce((s, i) => s + i.changePercent, 0) / dayIdeas.length) * 100
        ) / 100
      const sorted = [...dayIdeas].sort((a, b) => b.changePercent - a.changePercent)
      return {
        date,
        ideas: dayIdeas,
        avgChange,
        bestTicker: sorted[0]?.ticker ?? '',
        worstTicker: sorted[sorted.length - 1]?.ticker ?? '',
      }
    })
  }, [ideas])

  if (isLoading && ideas.length === 0) {
    return (
      <div className="space-y-4">
        <div className="h-16 app-card animate-pulse" />
        <div className="h-16 app-card animate-pulse" />
        <div className="h-16 app-card animate-pulse" />
      </div>
    )
  }

  if (!isLoading && ideas.length === 0 && filter === 'all') {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold text-slate-700 mb-2">
          No history yet
        </h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          As ideas are generated each day, they&apos;ll appear here with their
          outcomes. Check back after a few days to see how the AI&apos;s
          picks are performing.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="app-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
              Track Record
            </p>
            <h1 className="font-display text-2xl text-slate-900">
              Hindsight Machine
            </h1>
            {hitRate !== null && (
              <p className="text-sm text-slate-600">
                Hit rate: <span className="font-semibold">{hitRate}%</span>
                <span className="text-xs text-slate-400 ml-1">(ideas older than 7 days)</span>
              </p>
            )}
          </div>
          <div className="flex gap-1">
            {(['all', 'gains', 'losses'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs rounded-full border ${
                  filter === f
                    ? 'border-slate-900 text-slate-900 bg-white'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Ideas grouped by day */}
      <div className="space-y-5">
        {dayGroups.map((group) => (
          <div key={group.date}>
            {/* Day header */}
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-700">
                  {group.date}
                </span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                  {group.ideas.length} ideas
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>
                  Avg: <span className={group.avgChange >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                    {group.avgChange >= 0 ? '+' : ''}{group.avgChange.toFixed(2)}%
                  </span>
                </span>
                {group.ideas.length > 1 && (
                  <>
                    <span>Best: <span className="text-emerald-700 font-mono">{group.bestTicker}</span></span>
                    <span>Worst: <span className="text-rose-700 font-mono">{group.worstTicker}</span></span>
                  </>
                )}
              </div>
            </div>

            {/* Ideas for this day */}
            <div className="space-y-2">
              {group.ideas.map((idea) => {
                const isGain = idea.changePercent > 0
                const symbol = idea.currency === 'EUR' ? '\u20AC' : '$'

                return (
                  <div key={idea.id} className="app-card p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-slate-900">
                            {idea.ticker}
                          </span>
                          <span className="text-sm text-slate-500">
                            {idea.companyName}
                          </span>
                        </div>
                        <div className="text-sm text-slate-600 mt-1">
                          {idea.oneLiner}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-4 shrink-0">
                        <div className="text-right">
                          <div
                            className={`text-lg font-semibold ${
                              isGain ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {isGain ? '+' : ''}{idea.changePercent.toFixed(2)}%
                          </div>
                          <div className="text-xs text-slate-500">
                            {symbol}{idea.initialPrice.toFixed(2)} &rarr; {symbol}
                            {idea.currentPrice.toFixed(2)}
                          </div>
                          <div
                            className={`text-xs mt-0.5 ${
                              idea.hypotheticalReturn >= 0
                                ? 'text-emerald-700'
                                : 'text-rose-700'
                            }`}
                          >
                            {symbol}10 &rarr; {symbol}
                            {(10 + idea.hypotheticalReturn).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                    {idea.priceHistory && idea.priceHistory.length >= 2 && (
                      <div className="mt-2">
                        <AreaChart data={idea.priceHistory} height={40} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 text-sm border border-slate-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 text-slate-700"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-sm text-slate-500">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 text-sm border border-slate-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 text-slate-700"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
