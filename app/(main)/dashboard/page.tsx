'use client'

import { useEffect, useState } from 'react'
import { TickerTape } from '@/components/dashboard/TickerTape'
import { PortfolioSnapshot } from '@/components/dashboard/PortfolioSnapshot'
import { TopIdeasCard } from '@/components/dashboard/TopIdeasCard'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { AIBriefing } from '@/components/dashboard/AIBriefing'
import { MarketNews } from '@/components/dashboard/MarketNews'

interface PortfolioData {
  holdings: Array<{
    ticker: string
    currentPrice: number
    purchasePrice: number
    gainLossPercent: number
    idea: { currency: string } | null
  }>
  summary: {
    totalValue: number
    totalCost: number
    totalGainLoss: number
    totalGainLossPercent: number
    holdingCount: number
  }
}

interface IdeasData {
  ideas: Array<{
    id: string
    ticker: string
    companyName: string
    oneLiner: string
    riskLevel: 'safe' | 'interesting' | 'spicy'
    confidenceScore: number
    currentPrice: number
    initialPrice: number
    currency: string
  }>
}

interface WatchlistData {
  watchlist: Array<{
    ticker: string
    currentPrice: number
    addedPrice: number
    changePercent: number
    currency: string
  }>
}

interface HistoryData {
  ideas: Array<{
    ticker: string
    changePercent: number
  }>
  hitRate: number | null
}

interface RecommendationsData {
  recommendations: Array<{
    id: string
    ticker: string
    action: 'buy' | 'sell' | 'hold'
    reasoning: string
    confidence: number
  }>
}

interface BriefingData {
  news: Array<{
    ticker: string
    headline: string
    source: string
    datetime: string
    url: string
  }>
  briefing: string
}

async function fetchJSON<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export default function DashboardPage() {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null)
  const [ideas, setIdeas] = useState<IdeasData | null>(null)
  const [watchlist, setWatchlist] = useState<WatchlistData | null>(null)
  const [history, setHistory] = useState<HistoryData | null>(null)
  const [recommendations, setRecommendations] = useState<RecommendationsData | null>(null)
  const [briefing, setBriefing] = useState<BriefingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [briefingLoading, setBriefingLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [p, i, w, h, r] = await Promise.all([
        fetchJSON<PortfolioData>('/api/portfolio'),
        fetchJSON<IdeasData>('/api/ideas'),
        fetchJSON<WatchlistData>('/api/watchlist'),
        fetchJSON<HistoryData>('/api/history?limit=5'),
        fetchJSON<RecommendationsData>('/api/portfolio/recommendations'),
      ])
      setPortfolio(p)
      setIdeas(i)
      setWatchlist(w)
      setHistory(h)
      setRecommendations(r)
      setLoading(false)
    }
    async function loadBriefing() {
      const b = await fetchJSON<BriefingData>('/api/dashboard/briefing')
      setBriefing(b)
      setBriefingLoading(false)
    }
    load()
    loadBriefing()
  }, [])

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  // Build ticker tape data from all sources
  const tickerMap = new Map<string, { ticker: string; price: number; changePercent: number; currency: string }>()

  portfolio?.holdings.forEach((h) => {
    const changePercent = ((h.currentPrice - h.purchasePrice) / h.purchasePrice) * 100
    tickerMap.set(h.ticker, {
      ticker: h.ticker,
      price: h.currentPrice,
      changePercent,
      currency: h.idea?.currency ?? 'EUR',
    })
  })

  watchlist?.watchlist.forEach((w) => {
    if (!tickerMap.has(w.ticker)) {
      tickerMap.set(w.ticker, {
        ticker: w.ticker,
        price: w.currentPrice,
        changePercent: w.changePercent,
        currency: w.currency ?? 'EUR',
      })
    }
  })

  ideas?.ideas.forEach((idea) => {
    if (!tickerMap.has(idea.ticker)) {
      const changePercent = idea.initialPrice
        ? ((idea.currentPrice - idea.initialPrice) / idea.initialPrice) * 100
        : 0
      tickerMap.set(idea.ticker, {
        ticker: idea.ticker,
        price: idea.currentPrice,
        changePercent,
        currency: idea.currency ?? 'EUR',
      })
    }
  })

  const tickers = Array.from(tickerMap.values())

  // Top 3 movers by absolute gain/loss percent
  const topMovers = (portfolio?.holdings ?? [])
    .map((h) => ({
      ticker: h.ticker,
      gainLossPercent: h.gainLossPercent,
      currentPrice: h.currentPrice,
      currency: h.idea?.currency ?? 'EUR',
    }))
    .sort((a, b) => Math.abs(b.gainLossPercent) - Math.abs(a.gainLossPercent))
    .slice(0, 3)

  // Top 3 ideas by confidence
  const topIdeas = (ideas?.ideas ?? [])
    .sort((a, b) => b.confidenceScore - a.confidenceScore)
    .slice(0, 3)

  // Recent outcomes
  const recentOutcomes = (history?.ideas ?? []).slice(0, 3).map((o) => ({
    ticker: o.ticker,
    changePercent: o.changePercent,
  }))

  // Badge counts
  const holdingCount = portfolio?.summary.holdingCount ?? 0
  const ideaCount = ideas?.ideas.length ?? 0
  const watchCount = watchlist?.watchlist.length ?? 0

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-28 app-card animate-pulse" />
        <div className="h-24 app-card animate-pulse" />
        <div className="h-10 app-card animate-pulse" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-48 app-card animate-pulse" />
          <div className="h-48 app-card animate-pulse" />
        </div>
        <div className="h-40 app-card animate-pulse" />
        <div className="h-40 app-card animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="app-card p-5">
        <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
          {today}
        </span>
        <h1 className="font-display text-2xl text-slate-900 mt-1">
          Daily Overview
        </h1>
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="app-pill">{holdingCount} holding{holdingCount !== 1 ? 's' : ''}</span>
          <span className="app-pill">{ideaCount} idea{ideaCount !== 1 ? 's' : ''}</span>
          <span className="app-pill">{watchCount} watching</span>
        </div>
      </div>

      {/* AI Briefing */}
      <AIBriefing
        briefing={briefing?.briefing ?? ''}
        loading={briefingLoading}
      />

      {/* Ticker Tape */}
      {tickers.length > 0 && <TickerTape tickers={tickers} />}

      {/* Two-column grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PortfolioSnapshot
          summary={portfolio?.summary ?? { totalValue: 0, totalCost: 0, totalGainLoss: 0, totalGainLossPercent: 0, holdingCount: 0 }}
          topMovers={topMovers}
        />
        <TopIdeasCard ideas={topIdeas} />
      </div>

      {/* Market News */}
      <MarketNews news={briefing?.news ?? []} />

      {/* Activity Feed */}
      <ActivityFeed
        recommendations={(recommendations?.recommendations ?? []).slice(0, 3)}
        hitRate={history?.hitRate ?? null}
        recentOutcomes={recentOutcomes}
      />
    </div>
  )
}
