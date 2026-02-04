'use client'

import { useState } from 'react'
import { ConfidenceScore } from './ConfidenceScore'

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
  onAddToWatchlist?: (ideaId: string) => void
  isOnWatchlist?: boolean
}

const RISK_STYLES = {
  safe: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  interesting: 'bg-amber-50 text-amber-700 border-amber-200',
  spicy: 'bg-rose-50 text-rose-700 border-rose-200',
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
  onAddToWatchlist,
  isOnWatchlist,
}: IdeaCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="app-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-sm font-semibold text-slate-900">
              {ticker}
            </span>
            <span className={`text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-full border ${RISK_STYLES[riskLevel]}`}>
              {riskLevel}
            </span>
          </div>
          <div className="text-sm text-slate-600 mb-1">
            {companyName}
          </div>
          <div className="text-sm text-slate-800">
            {oneLiner}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-slate-400 uppercase tracking-[0.2em] mb-1">
            Price
          </div>
          <div className="font-mono text-lg font-semibold text-slate-900">
            {currency === 'EUR' ? '\u20AC' : '$'}{currentPrice.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <ConfidenceScore score={confidenceScore} signals={signals} />
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs uppercase tracking-[0.2em] text-slate-500 hover:text-slate-900"
        >
          {expanded ? 'Less' : 'Details'}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase mb-1">
              Thesis
            </div>
            <div className="text-sm text-slate-700 whitespace-pre-line">
              {thesis}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase mb-1">
              Bear Case
            </div>
            <div className="text-sm text-slate-700 whitespace-pre-line">
              {bearCase}
            </div>
          </div>
          {onAddToWatchlist && (
            <button
              onClick={() => onAddToWatchlist(id)}
              disabled={isOnWatchlist}
              className="text-xs px-3 py-2 rounded-full border border-teal-500 text-teal-700 hover:bg-teal-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isOnWatchlist ? 'Watching' : 'Add to watchlist'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
