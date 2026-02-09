'use client'

import { useState } from 'react'
import { AreaChart } from '@/components/ui/AreaChart'

interface IdeaCardProps {
  id: string
  ticker: string
  companyName: string
  oneLiner: string
  thesis: string
  bearCase: string
  riskLevel: 'safe' | 'interesting' | 'spicy'
  confidenceScore: number
  signals: {
    hiring: boolean
    earnings: boolean
    regulatory: boolean
    supplyChain: boolean
  }
  currentPrice: number
  currency: string
  priceHistory?: number[]
  onAddToWatchlist?: (ideaId: string) => Promise<boolean>
  onAddToPortfolio?: (ideaId: string, quantity: number) => Promise<boolean>
  isOnWatchlist?: boolean
  isInPortfolio?: boolean
}

const RISK_STYLES = {
  safe: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  interesting: 'bg-amber-50 text-amber-700 border-amber-200',
  spicy: 'bg-rose-50 text-rose-700 border-rose-200',
}

const SIGNAL_LABELS: Record<string, string> = {
  hiring: 'Hiring',
  earnings: 'Earnings',
  regulatory: 'Regulatory',
  supplyChain: 'Supply Chain',
}

function splitIntoBullets(text: string): string[] {
  return text
    .split(/(?<=\.)\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

export function IdeaCard({
  id,
  ticker,
  companyName,
  oneLiner,
  thesis,
  bearCase,
  riskLevel,
  confidenceScore,
  signals,
  currentPrice,
  currency,
  priceHistory,
  onAddToWatchlist,
  onAddToPortfolio,
  isOnWatchlist,
  isInPortfolio,
}: IdeaCardProps) {
  const [showBear, setShowBear] = useState(false)
  const [watchlistLoading, setWatchlistLoading] = useState(false)
  const [portfolioState, setPortfolioState] = useState<'idle' | 'quantity' | 'adding' | 'added'>('idle')
  const [quantity, setQuantity] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const symbol = currency === 'GBP' || currency === 'GBp' ? '\u00A3' : currency === 'USD' ? '$' : '\u20AC'

  const activeSignals = (Object.entries(signals) as [string, boolean][])
    .filter(([, v]) => v)
    .map(([k]) => SIGNAL_LABELS[k] || k)

  async function handleWatchlist() {
    if (!onAddToWatchlist || isOnWatchlist || watchlistLoading) return
    setWatchlistLoading(true)
    setError(null)
    try {
      const success = await onAddToWatchlist(id)
      if (!success) {
        setError('Failed to add to watchlist')
      }
    } catch {
      setError('Failed to add to watchlist')
    } finally {
      setWatchlistLoading(false)
    }
  }

  async function handlePortfolioConfirm() {
    if (!onAddToPortfolio || portfolioState === 'adding') return
    setPortfolioState('adding')
    setError(null)
    try {
      const success = await onAddToPortfolio(id, quantity)
      if (success) {
        setPortfolioState('added')
      } else {
        setError('Failed to add to portfolio')
        setPortfolioState('quantity')
      }
    } catch {
      setError('Failed to add to portfolio')
      setPortfolioState('quantity')
    }
  }

  return (
    <div className="app-card p-5">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-base font-bold text-slate-900">
              {ticker}
            </span>
            <span className={`text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-full border ${RISK_STYLES[riskLevel]}`}>
              {riskLevel}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {confidenceScore}%
            </span>
          </div>
          <div className="text-sm text-slate-500">{companyName}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono text-lg font-bold text-slate-900">
            {symbol}{currentPrice.toFixed(2)}
          </div>
        </div>
      </div>

      {/* One-liner: the quick pitch */}
      <p className="mt-3 text-sm font-medium text-slate-800">
        {oneLiner}
      </p>

      {/* Thesis: always visible */}
      <div className="mt-3">
        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-1">
          Why this idea
        </div>
        <ul className="space-y-1.5 text-sm text-slate-700 leading-relaxed">
          {splitIntoBullets(thesis).map((point, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-slate-300 shrink-0 mt-0.5">&bull;</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Price chart */}
      {priceHistory && priceHistory.length >= 2 && (
        <div className="mt-3">
          <AreaChart data={priceHistory} height={80} />
        </div>
      )}

      {/* Active signals as tags */}
      {activeSignals.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {activeSignals.map((label) => (
            <span
              key={label}
              className="text-[10px] uppercase tracking-[0.15em] px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-3 text-xs text-red-500">{error}</div>
      )}

      {/* Actions row */}
      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          onClick={() => setShowBear(!showBear)}
          className="text-xs uppercase tracking-[0.15em] text-slate-400 hover:text-slate-700"
        >
          {showBear ? 'Hide bear case' : 'Bear case'}
        </button>

        <div className="flex items-center gap-2">
          {/* Watchlist button */}
          {onAddToWatchlist && (
            <button
              onClick={handleWatchlist}
              disabled={isOnWatchlist || watchlistLoading}
              className="text-xs px-3 py-1.5 rounded-full border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {watchlistLoading ? 'Adding...' : isOnWatchlist ? 'Watching' : 'Watch'}
            </button>
          )}

          {/* Portfolio button */}
          {onAddToPortfolio && portfolioState === 'idle' && !isInPortfolio && (
            <button
              onClick={() => setPortfolioState('quantity')}
              className="text-xs px-3 py-1.5 rounded-full border border-teal-400 text-teal-700 hover:bg-teal-50"
            >
              Add to portfolio
            </button>
          )}

          {/* Quantity input */}
          {portfolioState === 'quantity' && (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-14 px-2 py-1 text-xs border border-slate-200 rounded text-center text-slate-700 bg-white"
              />
              <button
                onClick={handlePortfolioConfirm}
                className="text-xs px-3 py-1.5 rounded-full bg-teal-600 text-white hover:bg-teal-700"
              >
                Buy
              </button>
              <button
                onClick={() => { setPortfolioState('idle'); setError(null) }}
                className="text-xs px-2 py-1.5 text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
            </div>
          )}

          {portfolioState === 'adding' && (
            <span className="text-xs text-slate-400">Adding...</span>
          )}

          {(portfolioState === 'added' || isInPortfolio) && (
            <span className="text-xs text-teal-600 font-medium">In portfolio</span>
          )}
        </div>
      </div>

      {showBear && (
        <div className="mt-3 p-3 rounded-lg bg-rose-50/50 border border-rose-100">
          <div className="text-[10px] uppercase tracking-[0.2em] text-rose-400 mb-1">
            Bear case
          </div>
          <ul className="space-y-1.5 text-sm text-slate-700 leading-relaxed">
            {splitIntoBullets(bearCase).map((point, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-rose-300 shrink-0 mt-0.5">&bull;</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
