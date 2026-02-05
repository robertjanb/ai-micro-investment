'use client'

import { useState, useEffect } from 'react'

interface Idea {
  id: string
  ticker: string
  companyName: string
  currentPrice: number
}

interface AddHoldingFormProps {
  onAdd: (data: {
    ideaId?: string
    ticker: string
    companyName?: string
    quantity: number
    purchasePrice: number
    purchaseDate: string
    notes?: string
  }) => void
  onCancel: () => void
}

export function AddHoldingForm({ onAdd, onCancel }: AddHoldingFormProps) {
  const [mode, setMode] = useState<'idea' | 'manual'>('idea')
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [selectedIdeaId, setSelectedIdeaId] = useState('')
  const [ticker, setTicker] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [purchasePrice, setPurchasePrice] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadIdeas() {
      try {
        const res = await fetch('/api/ideas')
        if (res.ok) {
          const data = await res.json()
          setIdeas(data.ideas || [])
        }
      } catch (err) {
        console.error('Failed to load ideas:', err)
      }
    }
    loadIdeas()
  }, [])

  useEffect(() => {
    if (mode === 'idea' && selectedIdeaId) {
      const idea = ideas.find((i) => i.id === selectedIdeaId)
      if (idea) {
        setTicker(idea.ticker)
        setCompanyName(idea.companyName)
        setPurchasePrice(idea.currentPrice.toFixed(2))
      }
    } else if (mode === 'manual') {
      setSelectedIdeaId('')
    }
  }, [mode, selectedIdeaId, ideas])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const qty = parseFloat(quantity)
    const price = parseFloat(purchasePrice)

    if (!ticker.trim()) {
      setError('Ticker is required')
      return
    }
    if (isNaN(qty) || qty <= 0) {
      setError('Quantity must be a positive number')
      return
    }
    if (isNaN(price) || price <= 0) {
      setError('Price must be a positive number')
      return
    }
    if (!purchaseDate) {
      setError('Purchase date is required')
      return
    }

    setIsLoading(true)
    try {
      onAdd({
        ideaId: mode === 'idea' && selectedIdeaId ? selectedIdeaId : undefined,
        ticker: ticker.toUpperCase().trim(),
        companyName: companyName.trim() || undefined,
        quantity: qty,
        purchasePrice: price,
        purchaseDate,
        notes: notes.trim() || undefined,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Add Holding</h3>

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setMode('idea')}
          className={`px-3 py-1.5 text-xs uppercase tracking-[0.15em] rounded-full border ${
            mode === 'idea'
              ? 'bg-teal-50 border-teal-300 text-teal-700 dark:bg-teal-900/30 dark:border-teal-700 dark:text-teal-300'
              : 'border-gray-200 text-gray-500 dark:border-gray-600 dark:text-gray-400'
          }`}
        >
          From Ideas
        </button>
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`px-3 py-1.5 text-xs uppercase tracking-[0.15em] rounded-full border ${
            mode === 'manual'
              ? 'bg-teal-50 border-teal-300 text-teal-700 dark:bg-teal-900/30 dark:border-teal-700 dark:text-teal-300'
              : 'border-gray-200 text-gray-500 dark:border-gray-600 dark:text-gray-400'
          }`}
        >
          Manual Entry
        </button>
      </div>

      <div className="space-y-3">
        {mode === 'idea' && (
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Select Idea
            </label>
            <select
              value={selectedIdeaId}
              onChange={(e) => setSelectedIdeaId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Choose an idea...</option>
              {ideas.map((idea) => (
                <option key={idea.id} value={idea.id}>
                  {idea.ticker} - {idea.companyName} (&euro;{idea.currentPrice.toFixed(2)})
                </option>
              ))}
            </select>
          </div>
        )}

        {mode === 'manual' && (
          <>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Ticker
              </label>
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                placeholder="ABCD"
                maxLength={10}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Company Name (optional)
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Company Inc."
              />
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Quantity
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              step="0.01"
              min="0.01"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              Purchase Price (&euro;)
            </label>
            <input
              type="number"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              step="0.01"
              min="0.01"
              placeholder={mode === 'idea' ? 'Auto-filled' : '0.00'}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            Purchase Date
          </label>
          <input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            Notes (optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Why you bought this..."
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={isLoading || (mode === 'idea' && !selectedIdeaId)}
            className="px-4 py-2 text-sm bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Adding...' : 'Add Holding'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  )
}
