'use client'

import { useState, useEffect, useCallback } from 'react'
import { IdeaCard } from '@/components/ideas/IdeaCard'
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

export default function ChatPage() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isFirstVisit, setIsFirstVisit] = useState(false)
  const [nudgeMessage, setNudgeMessage] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      const [ideasRes, watchlistRes] = await Promise.all([
        fetch('/api/ideas'),
        fetch('/api/watchlist'),
      ])

      if (ideasRes.ok) {
        const data = await ideasRes.json()
        setIdeas(data.ideas)
      }

      if (watchlistRes.ok) {
        const data = await watchlistRes.json()
        const ids = new Set<string>(
          data.watchlist.map((item: { ideaId: string }) => item.ideaId)
        )
        setWatchlistIds(ids)
      }

      // Check if first visit (no conversation history)
      const hasVisited = localStorage.getItem('hasVisitedChat')
      if (!hasVisited) {
        setIsFirstVisit(true)
        localStorage.setItem('hasVisitedChat', 'true')
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

  async function handleAddToWatchlist(ideaId: string) {
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
      }
    } catch (error) {
      console.error('Failed to add to watchlist:', error)
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
      <div className="app-card p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">
              Daily Brief
            </p>
            <h1 className="font-display text-2xl text-slate-900">
              Modern fintech, zero hype -- just signal-based ideas.
            </h1>
            <p className="text-sm text-slate-600">
              Ask for a quick read, a deeper bear case, or a signal breakdown. All prices and ideas are simulated.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="app-pill">
              {ideas.length} ideas
            </div>
            <div className="app-pill">
              {watchlistIds.size} on watchlist
            </div>
            <div className="app-pill">
              Updated today
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-4">
          {isFirstVisit && <WelcomeMessage />}

          {nudgeMessage && (
            <div className="app-card-muted px-4 py-3 text-sm text-slate-700 border border-amber-200 bg-amber-50">
              {nudgeMessage}
            </div>
          )}

          <div className="app-card p-4">
            <ChatInterface quickPrompts={quickPrompts} />
          </div>
        </section>

        {ideas.length > 0 && (
          <aside className="space-y-4">
            <div className="app-card p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-sm text-slate-700">
                  Today&apos;s Ideas
                </h2>
                <span className="app-pill">{ideas.length} ideas</span>
              </div>
              <div className="mt-4 space-y-3">
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
                    onAddToWatchlist={handleAddToWatchlist}
                    isOnWatchlist={watchlistIds.has(idea.id)}
                  />
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
