'use client'

import { useState, useEffect, useCallback } from 'react'
import { HoldingCard } from '@/components/portfolio/HoldingCard'
import { PortfolioSummary } from '@/components/portfolio/PortfolioSummary'
import { RecommendationCard } from '@/components/portfolio/RecommendationCard'
import { AddHoldingForm } from '@/components/portfolio/AddHoldingForm'

interface Holding {
  id: string
  ideaId: string | null
  ticker: string
  companyName: string | null
  quantity: number
  purchasePrice: number
  currentPrice: number
  purchaseDate: string
  gainLoss: number
  gainLossPercent: number
  notes: string | null
}

interface Summary {
  totalValue: number
  totalCost: number
  totalGainLoss: number
  totalGainLossPercent: number
  holdingCount: number
}

interface Recommendation {
  id: string
  ticker: string
  action: 'buy' | 'sell' | 'hold'
  reasoning: string
  confidence: number
  holdingId: string | null
  holding: { id: string; ticker: string; companyName: string | null } | null
}

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingRecs, setIsLoadingRecs] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [error, setError] = useState('')

  const loadPortfolio = useCallback(async () => {
    try {
      const res = await fetch('/api/portfolio')
      if (res.ok) {
        const data = await res.json()
        setHoldings(data.holdings)
        setSummary(data.summary)
      }
    } catch (err) {
      console.error('Failed to load portfolio:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadRecommendations = useCallback(async () => {
    try {
      const res = await fetch('/api/portfolio/recommendations')
      if (res.ok) {
        const data = await res.json()
        setRecommendations(data.recommendations)
      }
    } catch (err) {
      console.error('Failed to load recommendations:', err)
    } finally {
      setIsLoadingRecs(false)
    }
  }, [])

  useEffect(() => {
    loadPortfolio()
    loadRecommendations()
  }, [loadPortfolio, loadRecommendations])

  async function handleAddHolding(data: {
    ideaId?: string
    ticker: string
    companyName?: string
    quantity: number
    purchasePrice: number
    purchaseDate: string
    notes?: string
  }) {
    setError('')
    try {
      const res = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const errData = await res.json()
        setError(errData.error || 'Failed to add holding')
        return
      }

      setShowAddForm(false)
      loadPortfolio()
      loadRecommendations()
    } catch (err) {
      console.error('Failed to add holding:', err)
      setError('Failed to add holding')
    }
  }

  async function handleEditHolding(id: string, data: { quantity?: number; notes?: string | null }) {
    try {
      const res = await fetch(`/api/portfolio/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        loadPortfolio()
      }
    } catch (err) {
      console.error('Failed to update holding:', err)
    }
  }

  async function handleDeleteHolding(id: string) {
    try {
      const res = await fetch(`/api/portfolio/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setHoldings((prev) => prev.filter((h) => h.id !== id))
        loadPortfolio()
        loadRecommendations()
      }
    } catch (err) {
      console.error('Failed to delete holding:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-24 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        <div className="h-20 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        <div className="h-20 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {summary && summary.holdingCount > 0 && (
        <PortfolioSummary
          totalValue={summary.totalValue}
          totalCost={summary.totalCost}
          totalGainLoss={summary.totalGainLoss}
          totalGainLossPercent={summary.totalGainLossPercent}
          holdingCount={summary.holdingCount}
        />
      )}

      {/* Daily Recommendations */}
      <section>
        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
          Daily Advice
        </h2>
        {isLoadingRecs ? (
          <div className="space-y-3">
            <div className="h-20 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
            <div className="h-20 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
          </div>
        ) : recommendations.length > 0 ? (
          <div className="space-y-3">
            {recommendations.map((rec) => (
              <RecommendationCard
                key={rec.id}
                ticker={rec.ticker}
                action={rec.action}
                reasoning={rec.reasoning}
                confidence={rec.confidence}
                holdingId={rec.holdingId}
                companyName={rec.holding?.companyName}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {holdings.length === 0
              ? 'Add some holdings to receive personalized recommendations.'
              : 'No recommendations available today.'}
          </p>
        )}
      </section>

      {/* Holdings */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Holdings ({holdings.length})
          </h2>
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="px-3 py-1.5 text-xs uppercase tracking-[0.15em] text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-700 rounded-full hover:bg-teal-50 dark:hover:bg-teal-900/30"
            >
              Add Holding
            </button>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
        )}

        {showAddForm && (
          <div className="mb-4">
            <AddHoldingForm
              onAdd={handleAddHolding}
              onCancel={() => {
                setShowAddForm(false)
                setError('')
              }}
            />
          </div>
        )}

        {holdings.length === 0 && !showAddForm ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              No holdings yet
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-4">
              Track your simulated investments here. Add holdings from today&apos;s
              ideas or enter them manually.
            </p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              Add Your First Holding
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {holdings.map((holding) => (
              <HoldingCard
                key={holding.id}
                id={holding.id}
                ticker={holding.ticker}
                companyName={holding.companyName}
                quantity={holding.quantity}
                purchasePrice={holding.purchasePrice}
                currentPrice={holding.currentPrice}
                purchaseDate={holding.purchaseDate}
                gainLoss={holding.gainLoss}
                gainLossPercent={holding.gainLossPercent}
                notes={holding.notes}
                onEdit={handleEditHolding}
                onDelete={handleDeleteHolding}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
