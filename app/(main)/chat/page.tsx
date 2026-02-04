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
        <div className="h-24 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        <div className="h-24 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        <div className="h-24 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {isFirstVisit && <WelcomeMessage />}

      {nudgeMessage && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-sm text-yellow-800 dark:text-yellow-300">
          {nudgeMessage}
        </div>
      )}

      {ideas.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
            Today&apos;s Ideas
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
      )}

      <ChatInterface />
    </div>
  )
}
