'use client'

import { useState, useEffect, useCallback } from 'react'
import { signOut } from 'next-auth/react'

const MARKET_OPTIONS = [
  { value: 'US', label: 'United States' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'GB', label: 'United Kingdom' },
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

export default function SettingsPage() {
  const [showConfirm, setShowConfirm] = useState(false)
  const [password, setPassword] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')

  // Idea config state
  const [config, setConfig] = useState<IdeaConfig | null>(null)
  const [configLoading, setConfigLoading] = useState(true)
  const [configSaving, setConfigSaving] = useState(false)
  const [configMessage, setConfigMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/idea-config')
      if (res.ok) {
        const data = await res.json()
        setConfig(data)
      }
    } catch {
      // silently fail, form will show defaults
    } finally {
      setConfigLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  async function handleSaveConfig() {
    if (!config) return

    if (config.markets.length === 0) {
      setConfigMessage({ type: 'error', text: 'Select at least one market' })
      return
    }

    setConfigSaving(true)
    setConfigMessage(null)

    try {
      const res = await fetch('/api/settings/idea-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      if (!res.ok) {
        const data = await res.json()
        setConfigMessage({ type: 'error', text: data.error || 'Failed to save' })
      } else {
        const data = await res.json()
        setConfig(data)
        setConfigMessage({ type: 'success', text: 'Saved. Today\'s ideas will regenerate with new preferences.' })
      }
    } catch {
      setConfigMessage({ type: 'error', text: 'Failed to save preferences' })
    } finally {
      setConfigSaving(false)
    }
  }

  function toggleArrayValue(arr: string[], value: string): string[] {
    return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]
  }

  async function handleDelete() {
    if (!password) {
      setError('Please enter your password')
      return
    }

    setIsDeleting(true)
    setError('')

    try {
      const res = await fetch('/api/user/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to delete account')
        setIsDeleting(false)
        return
      }

      await signOut({ callbackUrl: '/login' })
    } catch {
      setError('Failed to delete account')
      setIsDeleting(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Settings
      </h1>

      {/* Idea Preferences */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
        <h2 className="text-base font-medium text-gray-900 dark:text-white mb-4">
          Idea Preferences
        </h2>

        {configLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading preferences...</p>
        ) : config ? (
          <div className="space-y-5">
            {/* Markets */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Markets
              </label>
              <div className="flex flex-wrap gap-3">
                {MARKET_OPTIONS.map((m) => (
                  <label key={m.value} className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={config.markets.includes(m.value)}
                      onChange={() => setConfig({ ...config, markets: toggleArrayValue(config.markets, m.value) })}
                      className="rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                    />
                    {m.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Market Cap */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Market Cap (EUR)
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <input
                    type="number"
                    value={config.minMarketCapEur / 1_000_000}
                    onChange={(e) => setConfig({ ...config, minMarketCapEur: (parseFloat(e.target.value) || 0) * 1_000_000 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white"
                    placeholder="Min"
                    min={0}
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 block">Min (millions)</span>
                </div>
                <span className="text-gray-400">-</span>
                <div className="flex-1">
                  <input
                    type="number"
                    value={config.maxMarketCapEur !== null ? config.maxMarketCapEur / 1_000_000 : ''}
                    onChange={(e) => setConfig({ ...config, maxMarketCapEur: e.target.value ? parseFloat(e.target.value) * 1_000_000 : null })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white"
                    placeholder="No limit"
                    min={0}
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 block">Max (millions)</span>
                </div>
              </div>
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Price Range (EUR)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={config.minPriceEur}
                  onChange={(e) => setConfig({ ...config, minPriceEur: parseFloat(e.target.value) || 0 })}
                  className="w-28 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white"
                  placeholder="Min"
                  min={0}
                  step={1}
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  value={config.maxPriceEur ?? ''}
                  onChange={(e) => setConfig({ ...config, maxPriceEur: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-28 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white"
                  placeholder="No limit"
                  min={0}
                  step={1}
                />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 block">Leave max empty for no upper limit</span>
            </div>

            {/* P/E Ratio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                P/E Ratio Range
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={config.minPeRatio ?? ''}
                  onChange={(e) => setConfig({ ...config, minPeRatio: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white"
                  placeholder="Min"
                  min={0}
                  step={1}
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  value={config.maxPeRatio ?? ''}
                  onChange={(e) => setConfig({ ...config, maxPeRatio: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white"
                  placeholder="Max"
                  min={0}
                  step={1}
                />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 block">Leave empty for no limit</span>
            </div>

            {/* Dividend Yield */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Minimum Dividend Yield (%)
              </label>
              <input
                type="number"
                value={config.minDividendYield !== null ? config.minDividendYield * 100 : ''}
                onChange={(e) => setConfig({ ...config, minDividendYield: e.target.value ? parseFloat(e.target.value) / 100 : null })}
                className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white"
                placeholder="Any"
                min={0}
                step={0.5}
              />
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 block">Leave empty for no minimum</span>
            </div>

            {/* Sectors */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sectors
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Select to restrict to specific sectors. Leave all unchecked for all sectors.</p>
              <div className="grid grid-cols-2 gap-1.5">
                {SECTOR_OPTIONS.map((sector) => (
                  <label key={sector} className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={config.sectors.includes(sector)}
                      onChange={() => setConfig({ ...config, sectors: toggleArrayValue(config.sectors, sector) })}
                      className="rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                    />
                    {sector}
                  </label>
                ))}
              </div>
            </div>

            {/* Risk Levels */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Risk Levels
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Filter ideas by AI-assigned risk level. Leave all unchecked for all levels.</p>
              <div className="flex flex-wrap gap-3">
                {RISK_LEVEL_OPTIONS.map((r) => (
                  <label key={r.value} className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={config.riskLevels.includes(r.value)}
                      onChange={() => setConfig({ ...config, riskLevels: toggleArrayValue(config.riskLevels, r.value) })}
                      className="rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                    />
                    {r.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Save */}
            {configMessage && (
              <div className={`text-sm ${configMessage.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {configMessage.text}
              </div>
            )}
            <button
              onClick={handleSaveConfig}
              disabled={configSaving}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {configSaving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        ) : (
          <p className="text-sm text-red-500">Failed to load preferences</p>
        )}
      </div>

      {/* Delete Account */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h2 className="text-base font-medium text-red-600 dark:text-red-400 mb-2">
          Delete Account
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          This will permanently delete your account and all associated data
          including conversations, watchlist items, and preferences.
          This action cannot be undone.
        </p>

        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            className="px-4 py-2 text-sm border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            Delete my account
          </button>
        ) : (
          <div className="space-y-3 border-t border-gray-100 dark:border-gray-700 pt-4">
            {error && (
              <div className="text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Confirm your password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Confirm deletion'}
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false)
                  setPassword('')
                  setError('')
                }}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
