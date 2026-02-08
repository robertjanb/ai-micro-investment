'use client'

import { useState } from 'react'
import { AreaChart } from '@/components/ui/AreaChart'

interface HoldingAdvice {
  action: 'buy' | 'sell' | 'hold'
  reasoning: string
  confidence: number
}

interface HoldingCardProps {
  id: string
  ticker: string
  companyName: string | null
  quantity: number
  purchasePrice: number
  currentPrice: number
  purchaseDate: string
  gainLoss: number
  gainLossPercent: number
  notes: string | null
  priceHistory?: number[]
  advice?: HoldingAdvice | null
  onEdit: (id: string, data: { quantity?: number; notes?: string | null }) => void
  onDelete: (id: string) => void
}

const ADVICE_STYLES = {
  buy: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', label: 'Buy more' },
  sell: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', label: 'Sell' },
  hold: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', label: 'Hold' },
}

export function HoldingCard({
  id,
  ticker,
  companyName,
  quantity,
  purchasePrice,
  currentPrice,
  purchaseDate,
  gainLoss,
  gainLossPercent,
  notes,
  priceHistory,
  advice,
  onEdit,
  onDelete,
}: HoldingCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editQuantity, setEditQuantity] = useState(quantity.toString())
  const [editNotes, setEditNotes] = useState(notes || '')

  const isGain = gainLossPercent > 0
  const isLoss = gainLossPercent < 0
  const totalValue = quantity * currentPrice

  function handleSave() {
    const newQuantity = parseFloat(editQuantity)
    if (isNaN(newQuantity) || newQuantity <= 0) return

    onEdit(id, {
      quantity: newQuantity,
      notes: editNotes || null,
    })
    setIsEditing(false)
  }

  function handleCancel() {
    setEditQuantity(quantity.toString())
    setEditNotes(notes || '')
    setIsEditing(false)
  }

  // Gain/loss bar width (capped at 100%)
  const barPercent = Math.min(Math.abs(gainLossPercent), 100)

  return (
    <div className="app-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-slate-900">{ticker}</span>
            {companyName && (
              <span className="text-sm text-slate-500">{companyName}</span>
            )}
            {advice && (
              <span className={`text-[10px] uppercase tracking-[0.15em] px-2 py-0.5 rounded-full border ${ADVICE_STYLES[advice.action].bg} ${ADVICE_STYLES[advice.action].border} ${ADVICE_STYLES[advice.action].text}`}>
                {ADVICE_STYLES[advice.action].label}
              </span>
            )}
          </div>

          {isEditing ? (
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Quantity</label>
                <input
                  type="number"
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(e.target.value)}
                  className="w-32 px-2 py-1 text-sm border border-slate-200 rounded bg-white text-slate-900"
                  step="0.01"
                  min="0.01"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Notes</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-slate-200 rounded bg-white text-slate-900"
                  placeholder="Optional notes"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="px-3 py-1 text-xs bg-teal-600 text-white rounded hover:bg-teal-700"
                >
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1 text-xs text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Key metrics row */}
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Shares</div>
                  <div className="text-slate-700">{quantity}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Avg Cost</div>
                  <div className="text-slate-700">&euro;{purchasePrice.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Now</div>
                  <div className="text-slate-700">&euro;{currentPrice.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Value</div>
                  <div className="text-slate-700">&euro;{totalValue.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">P&amp;L</div>
                  <div
                    className={`font-semibold ${
                      isGain ? 'text-emerald-700' : isLoss ? 'text-rose-700' : 'text-slate-600'
                    }`}
                  >
                    {isGain ? '+' : ''}&euro;{gainLoss.toFixed(2)}
                    <span className="text-xs font-normal ml-1">
                      ({isGain ? '+' : ''}{gainLossPercent.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Visual gain/loss bar */}
              <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isGain ? 'bg-emerald-500' : isLoss ? 'bg-rose-500' : 'bg-slate-300'
                  }`}
                  style={{ width: `${barPercent}%` }}
                />
              </div>

              {/* Price chart */}
              {priceHistory && priceHistory.length >= 2 && (
                <div className="mt-2">
                  <AreaChart data={priceHistory} height={64} />
                </div>
              )}

              {/* Advice reasoning */}
              {advice && (
                <div className={`mt-3 p-2.5 rounded-lg ${ADVICE_STYLES[advice.action].bg} border ${ADVICE_STYLES[advice.action].border}`}>
                  <p className="text-xs text-slate-700">{advice.reasoning}</p>
                  <span className="text-[10px] text-slate-400 mt-1 inline-block">
                    {advice.confidence}% confidence
                  </span>
                </div>
              )}

              <div className="mt-2 text-xs text-slate-400">
                Purchased {new Date(purchaseDate).toLocaleDateString()}
                {notes && <span className="ml-2 italic">{notes}</span>}
              </div>
            </>
          )}
        </div>

        {!isEditing && (
          <div className="flex gap-2 ml-4">
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(id)}
              className="text-xs text-slate-400 hover:text-rose-500"
            >
              Remove
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
