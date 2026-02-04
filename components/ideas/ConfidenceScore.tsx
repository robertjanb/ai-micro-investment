'use client'

import { useState } from 'react'

interface Signals {
  hiring: boolean
  earnings: boolean
  regulatory: boolean
  supplyChain: boolean
}

const SIGNAL_LABELS: Record<keyof Signals, { label: string; description: string }> = {
  hiring: {
    label: 'Hiring',
    description: 'Company is actively expanding its workforce, indicating growth expectations',
  },
  earnings: {
    label: 'Earnings',
    description: 'Recent earnings data shows positive trends or beat expectations',
  },
  regulatory: {
    label: 'Regulatory',
    description: 'Favorable regulatory environment or recent approvals',
  },
  supplyChain: {
    label: 'Supply',
    description: 'Supply chain indicators suggest operational strength or improving conditions',
  },
}

export function ConfidenceScore({
  score,
  signals,
}: {
  score: number
  signals: Signals
}) {
  const [showLegend, setShowLegend] = useState(false)
  const activeCount = Object.values(signals).filter(Boolean).length

  return (
    <div className="relative">
      <button
        onClick={() => setShowLegend(!showLegend)}
        className="flex items-center gap-2 text-sm group"
      >
        <span className="text-gray-500 dark:text-gray-400">
          {score}% ({activeCount}/4)
        </span>
        <div className="flex gap-1">
          {(Object.keys(SIGNAL_LABELS) as Array<keyof Signals>).map((key) => (
            <div
              key={key}
              className={`w-2.5 h-2.5 rounded-full ${
                signals[key]
                  ? 'bg-blue-500'
                  : 'bg-gray-200 dark:bg-gray-600'
              }`}
              title={SIGNAL_LABELS[key].label}
            />
          ))}
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
          details
        </span>
      </button>

      {showLegend && (
        <div className="absolute z-10 mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-3">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Signal Breakdown
          </div>
          <div className="space-y-2">
            {(Object.keys(SIGNAL_LABELS) as Array<keyof Signals>).map((key) => (
              <div key={key} className="flex items-start gap-2">
                <div
                  className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${
                    signals[key]
                      ? 'bg-blue-500'
                      : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                />
                <div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {SIGNAL_LABELS[key].label}
                    {signals[key] ? ' (active)' : ' (inactive)'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {SIGNAL_LABELS[key].description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
