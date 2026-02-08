'use client'

import { useState } from 'react'
import { AreaChart } from '@/components/ui/AreaChart'

interface WatchlistItemProps {
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
  changeAbsolute?: number
  priceHistory?: number[]
  addedAt: string
  onRemove: (id: string) => void
  onAddToPortfolio: (data: { ideaId: string; ticker: string; companyName: string; currentPrice: number; quantity: number }) => Promise<boolean>
}

export function WatchlistItemCard({
  id,
  ideaId,
  ticker,
  companyName,
  addedPrice,
  currentPrice,
  currency,
  changePercent,
  changeAbsolute,
  priceHistory,
  addedAt,
  onRemove,
  onAddToPortfolio,
}: WatchlistItemProps) {
  const [addState, setAddState] = useState<'idle' | 'quantity' | 'adding' | 'added'>('idle')
  const [quantity, setQuantity] = useState('1')
  const isGain = changePercent > 0
  const isLoss = changePercent < 0
  const symbol = currency === 'EUR' ? '\u20AC' : '$'

  const daysWatched = Math.floor(
    (Date.now() - new Date(addedAt).getTime()) / (1000 * 60 * 60 * 24)
  )

  async function handleConfirmAdd() {
    const qty = parseInt(quantity, 10)
    if (isNaN(qty) || qty < 1) return
    setAddState('adding')
    const ok = await onAddToPortfolio({ ideaId, ticker, companyName, currentPrice, quantity: qty })
    setAddState(ok ? 'added' : 'idle')
  }

  return (
    <div className="app-card p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-slate-900">
              {ticker}
            </span>
            <span className="text-sm text-slate-500">
              {companyName}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-4 text-sm">
            <div className="text-slate-500">
              Added: {symbol}{addedPrice.toFixed(2)}
            </div>
            <div className="text-slate-500">
              Now: {symbol}{currentPrice.toFixed(2)}
            </div>
            <div
              className={`font-medium ${
                isGain
                  ? 'text-emerald-700'
                  : isLoss
                  ? 'text-rose-700'
                  : 'text-slate-600'
              }`}
            >
              {changeAbsolute !== undefined && (
                <span className="mr-1">
                  {isGain ? '+' : ''}{symbol}{changeAbsolute.toFixed(2)}
                </span>
              )}
              ({isGain ? '+' : ''}{changePercent.toFixed(2)}%)
            </div>
          </div>
          {priceHistory && priceHistory.length >= 2 && (
            <div className="mt-2">
              <AreaChart data={priceHistory} height={56} />
            </div>
          )}
          <div className="mt-1 text-xs text-slate-400">
            Added {new Date(addedAt).toLocaleDateString()}
            <span className="ml-2">{daysWatched}d watched</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 ml-3 shrink-0">
          {addState === 'quantity' ? (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-16 px-1.5 py-0.5 text-xs border border-slate-200 rounded bg-white text-slate-900 text-center"
                autoFocus
              />
              <button
                onClick={handleConfirmAdd}
                className="text-xs px-2 py-0.5 bg-teal-600 text-white rounded hover:bg-teal-700"
              >
                Confirm
              </button>
              <button
                onClick={() => { setAddState('idle'); setQuantity('1') }}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => addState === 'idle' && setAddState('quantity')}
              disabled={addState !== 'idle'}
              className="text-xs text-teal-600 hover:text-teal-800 disabled:opacity-50"
            >
              {addState === 'adding' ? 'Adding...' : addState === 'added' ? 'Added' : 'Add to Portfolio'}
            </button>
          )}
          <button
            onClick={() => onRemove(id)}
            className="text-xs text-slate-400 hover:text-rose-500"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  )
}
