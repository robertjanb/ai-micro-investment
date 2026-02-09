'use client'

import { useState, useEffect, useCallback } from 'react'
import { IdeaCard } from '@/components/ideas/IdeaCard'
import { IdeaPreferences } from '@/components/ideas/IdeaPreferences'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { WelcomeMessage } from '@/components/onboarding/WelcomeMessage'

interface Idea {
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
  priceHistory?: { price: number }[]
}

function getVisitorSessionId(): string {
  const key = 'visitorSessionId'
  let id = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${key}=`))
    ?.split('=')[1]

  if (!id) {
    id = crypto.randomUUID()
    document.cookie = `${key}=${id}; path=/; max-age=86400`
  }
  return id
}

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set())
  const [portfolioTickers, setPortfolioTickers] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isFirstVisit, setIsFirstVisit] = useState(false)
  const [nudgeMessage, setNudgeMessage] = useState<string | null>(null)
  const [ideasMessage, setIdeasMessage] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      const [ideasRes, watchlistRes, portfolioRes] = await Promise.all([
        fetch('/api/ideas'),
        fetch('/api/watchlist'),
        fetch('/api/portfolio'),
      ])

      if (ideasRes.ok) {
        const data = await ideasRes.json()
        setIdeas(data.ideas)
        setIdeasMessage(data.message || null)
      }

      if (watchlistRes.ok) {
        const data = await watchlistRes.json()
        const ids = new Set<string>(
          data.watchlist.map((item: { ideaId: string }) => item.ideaId)
        )
        setWatchlistIds(ids)
      }

      if (portfolioRes.ok) {
        const data = await portfolioRes.json()
        const tickers = new Set<string>(
          (data.holdings || []).map((h: { ticker: string }) => h.ticker)
        )
        setPortfolioTickers(tickers)
      }

      const hasVisited = localStorage.getItem('hasVisitedIdeas')
      if (!hasVisited) {
        setIsFirstVisit(true)
        localStorage.setItem('hasVisitedIdeas', 'true')
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleAddToWatchlist(ideaId: string): Promise<boolean> {
    try {
      const visitorSessionId = getVisitorSessionId()
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaId, visitorSessionId }),
      })

      if (res.ok) {
        const data = await res.json()
        setWatchlistIds((prev) => new Set(prev).add(ideaId))

        if (data.nudgeMessage) {
          setNudgeMessage(data.nudgeMessage)
          setTimeout(() => setNudgeMessage(null), 8000)
        }
        return true
      } else {
        const data = await res.json().catch(() => ({}))
        console.error('Watchlist add failed:', data.error || res.status)
        return false
      }
    } catch (error) {
      console.error('Failed to add to watchlist:', error)
      return false
    }
  }

  async function handleAddToPortfolio(ideaId: string, quantity: number): Promise<boolean> {
    try {
      const idea = ideas.find((i) => i.id === ideaId)
      if (!idea) return false

      const res = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ideaId,
          ticker: idea.ticker,
          companyName: idea.companyName,
          quantity,
          purchasePrice: idea.currentPrice,
          purchaseDate: new Date().toISOString().split('T')[0],
        }),
      })

      if (res.ok) {
        setPortfolioTickers((prev) => new Set(prev).add(idea.ticker))
        return true
      } else {
        const data = await res.json().catch(() => ({}))
        console.error('Portfolio add failed:', data.error || res.status)
        return false
      }
    } catch (error) {
      console.error('Failed to add to portfolio:', error)
      return false
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="app-card h-28 animate-pulse" />
        <div className="app-card h-40 animate-pulse" />
        <div className="app-card h-40 animate-pulse" />
      </div>
    )
  }

  const quickPrompts = [
    "Summarize today's ideas in two sentences.",
    'Which idea looks most conservative and why?',
    'Compare the top two confidence scores.',
    "What's the biggest red flag today?",
  ]

  return (
    <div className="space-y-6">
      {/* Header -- full width */}
      <div className="app-card p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
              Daily Brief
            </p>
            <h1 className="font-display text-2xl text-slate-900">
              Today&apos;s Investment Ideas
            </h1>
            <p className="text-sm text-slate-600">
              Signal-based picks with full reasoning. Add directly to your portfolio or watchlist.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="app-pill">
              {ideas.length} ideas
            </div>
            <div className="app-pill">
              {watchlistIds.size} watching
            </div>
          </div>
        </div>
      </div>

      <IdeaPreferences onSaved={() => {
        setIsLoading(true)
        loadData()
      }} />

      {isFirstVisit && <WelcomeMessage />}

      {nudgeMessage && (
        <div className="app-card-muted px-4 py-3 text-sm text-slate-700 border border-amber-200 bg-amber-50">
          {nudgeMessage}
        </div>
      )}

      {ideasMessage && ideas.length === 0 && (
        <div className="app-card px-4 py-3 text-sm text-slate-600 border border-amber-200 bg-amber-50/50">
          {ideasMessage} Adjust your preferences above and save to regenerate.
        </div>
      )}

      {/* Two-column layout: Ideas left, Chat right */}
      <div className="lg:grid lg:grid-cols-[1fr_420px] lg:gap-6 lg:items-start space-y-6 lg:space-y-0">
        {/* Left column: Ideas */}
        {ideas.length > 0 ? (
          <section className="space-y-4">
            {ideas.map((idea) => (
              <IdeaCard
                key={idea.id}
                id={idea.id}
                ticker={idea.ticker}
                companyName={idea.companyName}
                oneLiner={idea.oneLiner}
                thesis={idea.thesis}
                bearCase={idea.bearCase}
                riskLevel={idea.riskLevel}
                confidenceScore={idea.confidenceScore}
                signals={idea.signals}
                currentPrice={idea.currentPrice}
                currency={idea.currency}
                priceHistory={idea.priceHistory?.map((p) => p.price)}
                onAddToWatchlist={handleAddToWatchlist}
                onAddToPortfolio={handleAddToPortfolio}
                isOnWatchlist={watchlistIds.has(idea.id)}
                isInPortfolio={portfolioTickers.has(idea.ticker)}
              />
            ))}
          </section>
        ) : (
          <div />
        )}

        {/* Right column: Chat (sticky on desktop) */}
        <div className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-hidden">
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-2 px-1">
            Ask about these ideas
          </div>
          <div className="app-card p-4">
            <ChatInterface quickPrompts={quickPrompts} />
          </div>
        </div>
      </div>
    </div>
  )
}
