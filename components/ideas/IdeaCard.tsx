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
  safe: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  interesting: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  spicy: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
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
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono font-bold text-gray-900 dark:text-white">
              {ticker}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RISK_STYLES[riskLevel]}`}>
              {riskLevel}
            </span>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            {companyName}
          </div>
          <div className="text-sm text-gray-800 dark:text-gray-200">
            {oneLiner}
          </div>
        </div>
        <div className="text-right ml-4 shrink-0">
          <div className="font-mono text-lg font-semibold text-gray-900 dark:text-white">
            {currency === 'EUR' ? '\u20AC' : '$'}{currentPrice.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <ConfidenceScore score={confidenceScore} signals={signals} />
        <div className="flex gap-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            {expanded ? 'Less' : 'More'}
          </button>
          {onAddToWatchlist && (
            <button
              onClick={() => onAddToWatchlist(id)}
              disabled={isOnWatchlist}
              className="text-xs px-3 py-1 rounded border border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isOnWatchlist ? 'Watching' : 'Add to watchlist'}
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3 border-t border-gray-100 dark:border-gray-700 pt-3">
          <div>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
              Thesis
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
              {thesis}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
              Bear Case
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
              {bearCase}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
