'use client'

import { useState, useEffect, useCallback } from 'react'

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
  generatedDate: string
}

type Filter = 'all' | 'gains' | 'losses'

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

  if (isLoading && ideas.length === 0) {
    return (
      <div className="space-y-4">
        <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
      </div>
    )
  }

  if (!isLoading && ideas.length === 0 && filter === 'all') {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
          No history yet
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
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
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Hindsight Machine
            </h2>
            {hitRate !== null && (
              <div className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                Hit rate: {hitRate}%
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-2">
                  (ideas older than 7 days)
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-1">
            {(['all', 'gains', 'losses'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs rounded-full ${
                  filter === f
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Ideas list */}
      <div className="space-y-2">
        {ideas.map((idea) => {
          const isGain = idea.changePercent > 0
          const symbol = idea.currency === 'EUR' ? '\u20AC' : '$'

          return (
            <div
              key={idea.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-gray-900 dark:text-white">
                      {idea.ticker}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {idea.companyName}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(idea.generatedDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {idea.oneLiner}
                  </div>
                </div>
                <div className="text-right ml-4 shrink-0">
                  <div
                    className={`text-lg font-semibold ${
                      isGain
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {isGain ? '+' : ''}{idea.changePercent.toFixed(2)}%
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {symbol}{idea.initialPrice.toFixed(2)} → {symbol}
                    {idea.currentPrice.toFixed(2)}
                  </div>
                  <div
                    className={`text-xs mt-0.5 ${
                      idea.hypotheticalReturn >= 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {symbol}10 → {symbol}
                    {(10 + idea.hypotheticalReturn).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-sm text-gray-500 dark:text-gray-400">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
