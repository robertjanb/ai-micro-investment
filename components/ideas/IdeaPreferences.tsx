'use client'

import { useState, useEffect, useCallback } from 'react'

const MARKET_OPTIONS = [
  { value: 'US', label: 'US' },
  { value: 'DE', label: 'DE' },
  { value: 'FR', label: 'FR' },
  { value: 'NL', label: 'NL' },
  { value: 'GB', label: 'GB' },
]

const SECTOR_OPTIONS = [
  'Technology',
  'Healthcare',
  'Financial Services',
  'Consumer Cyclical',
  'Consumer Defensive',
  'Energy',
  'Industrials',
  'Basic Materials',
  'Communication Services',
  'Real Estate',
  'Utilities',
]

const RISK_LEVEL_OPTIONS = [
  { value: 'safe', label: 'Safe' },
  { value: 'interesting', label: 'Interesting' },
  { value: 'spicy', label: 'Spicy' },
]

interface IdeaConfig {
  markets: string[]
  minMarketCapEur: number
  maxMarketCapEur: number | null
  minPeRatio: number | null
  maxPeRatio: number | null
  minDividendYield: number | null
  sectors: string[]
  excludedSectors: string[]
  riskLevels: string[]
  minPriceEur: number
  maxPriceEur: number | null
}

interface IdeaPreferencesProps {
  onSaved: () => void
}

export function IdeaPreferences({ onSaved }: IdeaPreferencesProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [config, setConfig] = useState<IdeaConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/idea-config')
      if (res.ok) {
        setConfig(await res.json())
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  function toggleArrayValue(arr: string[], value: string): string[] {
    return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]
  }

  async function handleSave() {
    if (!config) return
    if (config.markets.length === 0) {
      setMessage({ type: 'error', text: 'Select at least one market' })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch('/api/settings/idea-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      if (!res.ok) {
        const data = await res.json()
        setMessage({ type: 'error', text: data.error || 'Failed to save' })
      } else {
        setConfig(await res.json())
        setMessage({ type: 'success', text: 'Preferences saved. Regenerating ideas...' })
        setTimeout(() => {
          setMessage(null)
          setIsOpen(false)
          onSaved()
        }, 1500)
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to save preferences' })
    } finally {
      setSaving(false)
    }
  }

  const activeSummary = config
    ? [
        config.markets.length < 5 ? config.markets.join(', ') : 'All markets',
        config.sectors.length > 0 ? `${config.sectors.length} sector${config.sectors.length > 1 ? 's' : ''}` : 'All sectors',
        config.riskLevels.length > 0 ? config.riskLevels.join(', ') : 'All risk levels',
      ].join(' · ')
    : ''

  return (
    <div className="app-card">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-3.5"
      >
        <div className="flex items-center gap-3 min-w-0">
          <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
          </svg>
          <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
            Preferences
          </span>
          {!isOpen && activeSummary && (
            <span className="text-[11px] text-slate-400 truncate">
              {activeSummary}
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {isOpen && (
        <div className="border-t border-slate-100 px-5 py-4">
          {loading ? (
            <p className="text-sm text-slate-400">Loading...</p>
          ) : !config ? (
            <p className="text-sm text-red-500">Failed to load preferences</p>
          ) : (
            <div className="space-y-5">
              {/* Markets */}
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                  Markets
                </label>
                <div className="flex flex-wrap gap-2">
                  {MARKET_OPTIONS.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => setConfig({ ...config, markets: toggleArrayValue(config.markets, m.value) })}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                        config.markets.includes(m.value)
                          ? 'border-blue-300 bg-blue-50 text-blue-700'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Risk Levels */}
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                  Risk Levels
                </label>
                <p className="text-[11px] text-slate-400 mb-1.5">Leave all unselected for all levels</p>
                <div className="flex flex-wrap gap-2">
                  {RISK_LEVEL_OPTIONS.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setConfig({ ...config, riskLevels: toggleArrayValue(config.riskLevels, r.value) })}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                        config.riskLevels.includes(r.value)
                          ? 'border-blue-300 bg-blue-50 text-blue-700'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sectors */}
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                  Sectors
                </label>
                <p className="text-[11px] text-slate-400 mb-1.5">Select to restrict. Leave all unselected for all sectors.</p>
                <div className="flex flex-wrap gap-1.5">
                  {SECTOR_OPTIONS.map((sector) => (
                    <button
                      key={sector}
                      onClick={() => setConfig({ ...config, sectors: toggleArrayValue(config.sectors, sector) })}
                      className={`px-2.5 py-1 text-[11px] rounded-full border transition-colors ${
                        config.sectors.includes(sector)
                          ? 'border-blue-300 bg-blue-50 text-blue-700'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {sector}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range + Market Cap in a grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                    Price Range (EUR)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={config.minPriceEur}
                      onChange={(e) => setConfig({ ...config, minPriceEur: parseFloat(e.target.value) || 0 })}
                      className="w-20 px-2 py-1.5 border border-slate-200 rounded text-xs text-slate-700 bg-white"
                      placeholder="Min"
                      min={0}
                    />
                    <span className="text-slate-300 text-xs">-</span>
                    <input
                      type="number"
                      value={config.maxPriceEur ?? ''}
                      onChange={(e) => setConfig({ ...config, maxPriceEur: e.target.value ? parseFloat(e.target.value) : null })}
                      className="w-20 px-2 py-1.5 border border-slate-200 rounded text-xs text-slate-700 bg-white"
                      placeholder="No limit"
                      min={0}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                    Market Cap (EUR M)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={config.minMarketCapEur / 1_000_000}
                      onChange={(e) => setConfig({ ...config, minMarketCapEur: (parseFloat(e.target.value) || 0) * 1_000_000 })}
                      className="w-20 px-2 py-1.5 border border-slate-200 rounded text-xs text-slate-700 bg-white"
                      placeholder="Min"
                      min={0}
                    />
                    <span className="text-slate-300 text-xs">-</span>
                    <input
                      type="number"
                      value={config.maxMarketCapEur !== null ? config.maxMarketCapEur / 1_000_000 : ''}
                      onChange={(e) => setConfig({ ...config, maxMarketCapEur: e.target.value ? parseFloat(e.target.value) * 1_000_000 : null })}
                      className="w-20 px-2 py-1.5 border border-slate-200 rounded text-xs text-slate-700 bg-white"
                      placeholder="No limit"
                      min={0}
                    />
                  </div>
                </div>
              </div>

              {/* P/E Ratio + Dividend Yield */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                    P/E Ratio
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={config.minPeRatio ?? ''}
                      onChange={(e) => setConfig({ ...config, minPeRatio: e.target.value ? parseFloat(e.target.value) : null })}
                      className="w-20 px-2 py-1.5 border border-slate-200 rounded text-xs text-slate-700 bg-white"
                      placeholder="Min"
                      min={0}
                    />
                    <span className="text-slate-300 text-xs">-</span>
                    <input
                      type="number"
                      value={config.maxPeRatio ?? ''}
                      onChange={(e) => setConfig({ ...config, maxPeRatio: e.target.value ? parseFloat(e.target.value) : null })}
                      className="w-20 px-2 py-1.5 border border-slate-200 rounded text-xs text-slate-700 bg-white"
                      placeholder="Max"
                      min={0}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                    Min Dividend Yield
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={config.minDividendYield !== null ? config.minDividendYield * 100 : ''}
                      onChange={(e) => setConfig({ ...config, minDividendYield: e.target.value ? parseFloat(e.target.value) / 100 : null })}
                      className="w-20 px-2 py-1.5 border border-slate-200 rounded text-xs text-slate-700 bg-white"
                      placeholder="Any"
                      min={0}
                      step={0.5}
                    />
                    <span className="text-xs text-slate-400">%</span>
                  </div>
                </div>
              </div>

              {/* Save + Message */}
              {message && (
                <div className={`text-xs ${message.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                  {message.text}
                </div>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save & Regenerate Ideas'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
