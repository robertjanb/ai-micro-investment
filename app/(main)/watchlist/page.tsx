'use client'

import { useState, useEffect, useCallback } from 'react'
import { WatchlistItemCard } from '@/components/watchlist/WatchlistItem'

interface WatchlistEntry {
  id: string
  ideaId: string
  ticker: string
  companyName: string
  oneLiner: string
  riskLevel: string
  addedPrice: number
  currentPrice: number
  currency: string
  changePercent: number
  addedAt: string
}

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadWatchlist = useCallback(async () => {
    try {
      const res = await fetch('/api/watchlist')
      if (res.ok) {
        const data = await res.json()
        setItems(data.watchlist)
      }
    } catch (error) {
      console.error('Failed to load watchlist:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadWatchlist()
  }, [loadWatchlist])

  async function handleRemove(id: string) {
    try {
      const res = await fetch(`/api/watchlist/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.id !== id))
      }
    } catch (error) {
      console.error('Failed to remove item:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-20 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        <div className="h-20 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Your watchlist is empty
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          When you find an idea worth tracking, add it here and I&apos;ll show
          you how it would&apos;ve performed. Head to Chat to see today&apos;s
          ideas.
        </p>
      </div>
    )
  }

  const totalInvested = items.length * 10
  const totalValue = items.reduce(
    (sum, item) => sum + 10 * (item.currentPrice / item.addedPrice),
    0
  )
  const totalReturn = Math.round((totalValue - totalInvested) * 100) / 100
  const totalReturnPercent =
    Math.round((totalReturn / totalInvested) * 10000) / 100

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
          Paper Portfolio Summary
        </h2>
        <div className="flex gap-8">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Items
            </div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {items.length}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Hypothetical (\u20AC10/idea)
            </div>
            <div
              className={`text-lg font-semibold ${
                totalReturn >= 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {totalReturn >= 0 ? '+' : ''}\u20AC{totalReturn.toFixed(2)} (
              {totalReturnPercent >= 0 ? '+' : ''}
              {totalReturnPercent.toFixed(2)}%)
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <WatchlistItemCard
            key={item.id}
            id={item.id}
            ticker={item.ticker}
            companyName={item.companyName}
            oneLiner={item.oneLiner}
            riskLevel={item.riskLevel}
            addedPrice={item.addedPrice}
            currentPrice={item.currentPrice}
            currency={item.currency}
            changePercent={item.changePercent}
            addedAt={item.addedAt}
            onRemove={handleRemove}
          />
        ))}
      </div>
    </div>
  )
}
