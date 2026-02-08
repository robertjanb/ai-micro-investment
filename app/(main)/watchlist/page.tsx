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
  changeAbsolute: number
  priceHistory: number[]
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

  async function handleAddToPortfolio(data: {
    ideaId: string
    ticker: string
    companyName: string
    currentPrice: number
    quantity: number
  }): Promise<boolean> {
    try {
      const res = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ideaId: data.ideaId,
          ticker: data.ticker,
          companyName: data.companyName,
          quantity: data.quantity,
          purchasePrice: data.currentPrice,
          purchaseDate: new Date().toISOString().split('T')[0],
        }),
      })
      return res.ok
    } catch (error) {
      console.error('Failed to add to portfolio:', error)
      return false
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-20 app-card animate-pulse" />
        <div className="h-20 app-card animate-pulse" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold text-slate-700 mb-2">
          Your watchlist is empty
        </h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          When you find an idea worth tracking, add it here and I&apos;ll show
          you how it would&apos;ve performed. Head to Ideas to see today&apos;s
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
      <div className="app-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
              Watchlist
            </p>
            <h1 className="font-display text-2xl text-slate-900">
              Paper Portfolio
            </h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="app-pill">
              {items.length} items
            </div>
            <div className={`app-pill ${totalReturn >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {totalReturn >= 0 ? '+' : ''}&euro;{totalReturn.toFixed(2)} ({totalReturnPercent >= 0 ? '+' : ''}{totalReturnPercent.toFixed(2)}%)
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <WatchlistItemCard
            key={item.id}
            id={item.id}
            ideaId={item.ideaId}
            ticker={item.ticker}
            companyName={item.companyName}
            oneLiner={item.oneLiner}
            riskLevel={item.riskLevel}
            addedPrice={item.addedPrice}
            currentPrice={item.currentPrice}
            currency={item.currency}
            changePercent={item.changePercent}
            changeAbsolute={item.changeAbsolute}
            priceHistory={item.priceHistory}
            addedAt={item.addedAt}
            onRemove={handleRemove}
            onAddToPortfolio={handleAddToPortfolio}
          />
        ))}
      </div>
    </div>
  )
}
