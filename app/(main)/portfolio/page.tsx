'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { HoldingCard } from '@/components/portfolio/HoldingCard'
import { PortfolioSummary } from '@/components/portfolio/PortfolioSummary'
import { AddHoldingForm } from '@/components/portfolio/AddHoldingForm'
import { AlertsPanel } from '@/components/portfolio/AlertsPanel'
import { OpsStatusCard } from '@/components/portfolio/OpsStatusCard'

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
  priceHistory?: number[]
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

interface CronStatusSummary {
  usersProcessed?: number
  totalUpdated?: number
  totalFailed?: number
  totalSkipped?: number
}

interface CronStatus {
  name: string
  lastRunAt: string | null
  lastSuccessAt: string | null
  lastError: string | null
  lastSummary: CronStatusSummary | null
}

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingRecs, setIsLoadingRecs] = useState(true)
  const [isRefreshingRecs, setIsRefreshingRecs] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [recsGeneratedAt, setRecsGeneratedAt] = useState<string | null>(null)
  const [recsCached, setRecsCached] = useState(false)
  const [pricesStale, setPricesStale] = useState(false)
  const [cronStatus, setCronStatus] = useState<CronStatus | null>(null)
  const [showOps, setShowOps] = useState(false)

  const refreshPrices = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const res = await fetch('/api/portfolio/update-prices', { method: 'POST' })
      if (res.ok) {
        const portfolioRes = await fetch('/api/portfolio')
        if (portfolioRes.ok) {
          const data = await portfolioRes.json()
          setHoldings(data.holdings)
          setSummary(data.summary)
          setLastUpdated(data.lastUpdated)
          setPricesStale(Boolean(data.pricesStale))
        }
      }
    } catch (err) {
      console.error('Failed to refresh prices:', err)
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  const loadPortfolio = useCallback(async (autoRefreshIfStale = false) => {
    try {
      const res = await fetch('/api/portfolio')
      if (res.ok) {
        const data = await res.json()
        setHoldings(data.holdings)
        setSummary(data.summary)
        setLastUpdated(data.lastUpdated)
        setPricesStale(Boolean(data.pricesStale))

        if (autoRefreshIfStale && data.pricesStale && data.holdings.length > 0) {
          refreshPrices()
        }
      }
    } catch (err) {
      console.error('Failed to load portfolio:', err)
    } finally {
      setIsLoading(false)
    }
  }, [refreshPrices])

  const loadRecommendations = useCallback(async (force = false) => {
    if (force) setIsRefreshingRecs(true)
    try {
      const url = force
        ? '/api/portfolio/recommendations?force=true'
        : '/api/portfolio/recommendations'
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setRecommendations(data.recommendations)
        setRecsGeneratedAt(data.generatedAt || null)
        setRecsCached(Boolean(data.cached))
      }
    } catch (err) {
      console.error('Failed to load recommendations:', err)
    } finally {
      setIsLoadingRecs(false)
      setIsRefreshingRecs(false)
    }
  }, [])

  const loadCronStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/cron/status?name=portfolio-price-update')
      if (res.ok) {
        const data = await res.json()
        setCronStatus(data.status || null)
      }
    } catch (err) {
      console.error('Failed to load cron status:', err)
    }
  }, [])

  useEffect(() => {
    loadPortfolio(true)
    loadRecommendations()
    loadCronStatus()
  }, [loadPortfolio, loadRecommendations, loadCronStatus])

  // Map recommendations to holdings by ticker
  const adviceByTicker = useMemo(() => {
    const map = new Map<string, { action: 'buy' | 'sell' | 'hold'; reasoning: string; confidence: number }>()
    for (const rec of recommendations) {
      map.set(rec.ticker, { action: rec.action, reasoning: rec.reasoning, confidence: rec.confidence })
    }
    return map
  }, [recommendations])

  // New-buy recommendations (not linked to existing holdings)
  const newBuyRecs = useMemo(() => {
    return recommendations.filter((r) => r.action === 'buy' && !r.holdingId)
  }, [recommendations])

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

  const formatRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleDateString()
  }

  const alerts = useMemo(() => {
    const items: Array<{ id: string; title: string; description: string; tone: 'info' | 'warning' | 'negative' | 'positive' }> = []

    if (pricesStale && holdings.length > 0) {
      items.push({
        id: 'prices-stale',
        title: 'Prices stale',
        description: 'Refresh prices to bring the portfolio up to date.',
        tone: 'warning',
      })
    }

    if (summary && summary.totalGainLossPercent <= -10) {
      items.push({
        id: 'portfolio-down',
        title: 'Drawdown',
        description: `Portfolio is down ${Math.abs(summary.totalGainLossPercent).toFixed(1)}%. Review exposures.`,
        tone: 'negative',
      })
    }

    const bigWinners = holdings
      .filter((h) => h.gainLossPercent >= 20)
      .sort((a, b) => b.gainLossPercent - a.gainLossPercent)
      .slice(0, 2)

    for (const winner of bigWinners) {
      items.push({
        id: `winner-${winner.id}`,
        title: 'Large gain',
        description: `${winner.ticker} up ${winner.gainLossPercent.toFixed(1)}%. Consider trimming if position size grew.`,
        tone: 'positive',
      })
    }

    const bigLosers = holdings
      .filter((h) => h.gainLossPercent <= -15)
      .sort((a, b) => a.gainLossPercent - b.gainLossPercent)
      .slice(0, 2)

    for (const loser of bigLosers) {
      items.push({
        id: `loser-${loser.id}`,
        title: 'Large drawdown',
        description: `${loser.ticker} down ${Math.abs(loser.gainLossPercent).toFixed(1)}%. Recheck thesis.`,
        tone: 'negative',
      })
    }

    if (cronStatus?.lastError) {
      items.push({
        id: 'cron-error',
        title: 'Cron error',
        description: 'Last scheduled price refresh failed. See Ops status for details.',
        tone: 'warning',
      })
    }

    return items
  }, [cronStatus?.lastError, holdings, pricesStale, summary])

  // Sort holdings: biggest gainers first, then losers
  const sortedHoldings = useMemo(() => {
    return [...holdings].sort((a, b) => b.gainLossPercent - a.gainLossPercent)
  }, [holdings])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-24 app-card animate-pulse" />
        <div className="h-20 app-card animate-pulse" />
        <div className="h-20 app-card animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header — full width */}
      <div className="app-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
              Portfolio
            </p>
            <h1 className="font-display text-2xl text-slate-900">
              Your Holdings &amp; Advice
            </h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="app-pill">
              {holdings.length} holdings
            </div>
            <div className="app-pill">
              {recommendations.length} tips
            </div>
            {lastUpdated && (
              <div className="app-pill">
                Prices: {formatRelativeTime(lastUpdated)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Two-column layout: Summary left, Holdings right */}
      <div className="lg:grid lg:grid-cols-[340px_1fr] lg:gap-6 lg:items-start space-y-6 lg:space-y-0">
        {/* Left column: Summary & overview (sticky on desktop) */}
        <div className="space-y-6 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
          {/* Summary + refresh */}
          {summary && summary.holdingCount > 0 && (
          <div className="space-y-3">
            <PortfolioSummary
              totalValue={summary.totalValue}
              totalCost={summary.totalCost}
              totalGainLoss={summary.totalGainLoss}
              totalGainLossPercent={summary.totalGainLossPercent}
              holdingCount={summary.holdingCount}
              holdings={holdings.map((h) => ({
                ticker: h.ticker,
                value: h.quantity * h.currentPrice,
              }))}
            />

            {/* Quick P&L overview — one bar per holding */}
            <div className="app-card p-4">
              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-3">
                Gains &amp; Losses at a Glance
              </div>
              <div className="space-y-2">
                {sortedHoldings.map((h) => {
                  const isGain = h.gainLossPercent > 0
                  const isLoss = h.gainLossPercent < 0
                  const barW = Math.min(Math.abs(h.gainLossPercent), 50)
                  const advice = adviceByTicker.get(h.ticker)
                  return (
                    <div key={h.id} className="flex items-center gap-2 lg:gap-1.5 text-xs">
                      <span className="font-mono font-semibold text-slate-900 w-10 shrink-0">{h.ticker}</span>
                      <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isGain ? 'bg-emerald-500' : isLoss ? 'bg-rose-500' : 'bg-slate-300'
                          }`}
                          style={{ width: `${barW * 2}%` }}
                        />
                      </div>
                      <span
                        className={`w-14 text-right font-mono ${
                          isGain ? 'text-emerald-700' : isLoss ? 'text-rose-700' : 'text-slate-500'
                        }`}
                      >
                        {isGain ? '+' : ''}{h.gainLossPercent.toFixed(1)}%
                      </span>
                      {advice && (
                        <span
                          className={`hidden sm:inline lg:hidden w-10 text-center text-[9px] uppercase tracking-wider ${
                            advice.action === 'sell'
                              ? 'text-rose-600'
                              : advice.action === 'buy'
                              ? 'text-emerald-600'
                              : 'text-amber-600'
                          }`}
                        >
                          {advice.action}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-slate-500">
              <button
                onClick={refreshPrices}
                disabled={isRefreshing}
                className="px-3 py-1 text-xs uppercase tracking-[0.1em] text-slate-700 border border-slate-200 rounded-full hover:bg-slate-50 disabled:opacity-50"
              >
                {isRefreshing ? 'Refreshing...' : 'Refresh Prices'}
              </button>
              {holdings.length > 0 && !isLoadingRecs && (
                <button
                  onClick={() => loadRecommendations(true)}
                  disabled={isRefreshingRecs}
                  className="px-3 py-1 text-xs uppercase tracking-[0.1em] text-slate-700 border border-slate-200 rounded-full hover:bg-slate-50 disabled:opacity-50"
                >
                  {isRefreshingRecs ? 'Regenerating...' : 'Refresh Advice'}
                </button>
              )}
            </div>
            {recsGeneratedAt && !isLoadingRecs && (
              <div className="text-right text-xs text-slate-400">
                Advice generated {formatRelativeTime(recsGeneratedAt) || 'today'}
                {recsCached && ' (cached)'}
              </div>
            )}
          </div>
        )}

        {alerts.length > 0 && (
          <AlertsPanel alerts={alerts} />
        )}

        <details open={showOps} onToggle={(e) => setShowOps((e.target as HTMLDetailsElement).open)}>
          <summary className="cursor-pointer list-none flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600">
            <span>{showOps ? '\u25BC' : '\u25B6'}</span>
            Ops Status
          </summary>
          <div className="mt-3">
            <OpsStatusCard
              pricesUpdatedAt={lastUpdated}
              pricesStale={pricesStale}
              cronStatus={cronStatus}
              formatRelativeTime={formatRelativeTime}
            />
          </div>
        </details>
      </div>

      {/* Right column: Holdings & recommendations */}
      <div className="space-y-6">
        {/* New buy recommendations (not linked to existing holdings) */}
        {newBuyRecs.length > 0 && (
          <section>
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-2 px-1">
              New buy ideas from your advisor
            </div>
            <div className="space-y-2">
              {newBuyRecs.map((rec) => (
                <div key={rec.id} className="app-card p-4 bg-emerald-50/50 ring-1 ring-emerald-200">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase tracking-[0.15em] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Buy</span>
                    <span className="font-mono text-sm font-bold text-slate-900">{rec.ticker}</span>
                    {rec.holding?.companyName && (
                      <span className="text-sm text-slate-500">{rec.holding.companyName}</span>
                    )}
                    <span className="text-[10px] uppercase tracking-[0.15em] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">New</span>
                  </div>
                  <p className="text-sm text-slate-700">{rec.reasoning}</p>
                  <span className="text-[10px] text-slate-400">{rec.confidence}% confidence</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Holdings with integrated advice */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Holdings ({holdings.length})
            </h2>
            {!showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="px-3 py-1.5 text-xs uppercase tracking-[0.15em] text-teal-700 border border-teal-300 rounded-full hover:bg-teal-50"
              >
                Add Holding
              </button>
            )}
          </div>

          {error && (
            <p className="text-sm text-rose-600 mb-3">{error}</p>
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
            <div className="app-card p-8 text-center">
              <h3 className="text-lg font-semibold text-slate-700 mb-2">
                No holdings yet
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mb-4">
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
              {sortedHoldings.map((holding) => (
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
                  priceHistory={holding.priceHistory}
                  advice={adviceByTicker.get(holding.ticker) || null}
                  onEdit={handleEditHolding}
                  onDelete={handleDeleteHolding}
                />
              ))}
            </div>
          )}
        </section>
      </div>
      </div>
    </div>
  )
}
