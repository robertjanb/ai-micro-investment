'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

type Horizon = 1 | 7 | 30

type ResultFilter = 'all' | 'win' | 'loss' | 'pending'

interface OverviewResponse {
  totals: {
    snapshots: number
    evaluated: number
    pending: number
    scored: number
    stale: number
  }
  horizons: Record<string, {
    count: number
    winRate: number | null
    avgReturn: number | null
    medianReturn: number | null
  }>
  calibration: Array<{
    bucket: string
    count: number
    winRate: number | null
    avgReturn: number | null
  }>
  dataQuality: {
    ok: number
    stale: number
    missing: number
  }
}

interface ScoreboardResponse {
  horizon: Horizon
  totals: {
    evaluated: number
  }
  scoreboards: {
    action: ScoreboardRow[]
    riskLevel: ScoreboardRow[]
    confidenceBucket: ScoreboardRow[]
  }
}

interface ScoreboardRow {
  key: string
  count: number
  winRate: number | null
  avgReturn: number | null
  medianReturn: number | null
}

interface RecommendationResponse {
  recommendations: Array<{
    id: string
    ticker: string
    action: 'buy' | 'sell' | 'hold'
    confidence: number
    confidenceBucket: string
    entryPrice: number
    currency: string
    riskLevel: string | null
    status: string
    generatedAt: string
    evaluations: Record<string, {
      returnPct: number | null
      isWin: boolean | null
      dataQuality: 'ok' | 'missing' | 'stale'
      exitPrice: number | null
      targetDate: string
    }>
  }>
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

function formatPct(value: number | null) {
  if (value === null || Number.isNaN(value)) return '—'
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

function formatCurrency(value: number, currency: string) {
  const symbol = currency === 'GBP' || currency === 'GBp' ? '£' : currency === 'USD' ? '$' : '€'
  return `${symbol}${value.toFixed(2)}`
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

const isMockMode = process.env.NEXT_PUBLIC_DATA_SOURCE === 'mock'

export default function PerformancePage() {
  const [overview, setOverview] = useState<OverviewResponse | null>(null)
  const [scoreboard, setScoreboard] = useState<ScoreboardResponse | null>(null)
  const [rows, setRows] = useState<RecommendationResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [isReseeding, setIsReseeding] = useState(false)
  const [horizon, setHorizon] = useState<Horizon>(7)
  const [result, setResult] = useState<ResultFilter>('all')
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    const [overviewData, scoreboardData, recommendationsData] = await Promise.all([
      fetchJSON<OverviewResponse>('/api/performance/overview'),
      fetchJSON<ScoreboardResponse>(`/api/performance/scoreboard?horizon=${horizon}`),
      fetchJSON<RecommendationResponse>(
        `/api/performance/recommendations?horizon=${horizon}&result=${result === 'all' ? '' : result}&page=${page}&limit=15`
      ),
    ])

    setOverview(overviewData)
    setScoreboard(scoreboardData)
    setRows(recommendationsData)
    setLoading(false)
  }, [horizon, result, page])

  // Auto-evaluate pending snapshots on page load, then refresh data
  useEffect(() => {
    let cancelled = false
    async function autoEvaluateAndLoad() {
      try {
        await fetch('/api/performance/evaluate', { method: 'POST' })
      } catch {
        // Evaluation is best-effort
      }
      if (!cancelled) {
        await load()
      }
    }
    autoEvaluateAndLoad()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reload when filters change (but not on initial mount)
  const [initialized, setInitialized] = useState(false)
  useEffect(() => {
    if (initialized) {
      load()
    } else {
      setInitialized(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horizon, result, page])

  useEffect(() => {
    setPage(1)
  }, [horizon, result])

  const calibrationMax = useMemo(() => {
    return Math.max(1, ...(overview?.calibration.map((item) => item.count) ?? [1]))
  }, [overview])

  async function runEvaluation() {
    setIsEvaluating(true)
    await fetch('/api/performance/evaluate', { method: 'POST' })
    await load()
    setIsEvaluating(false)
  }

  async function reseedMockData() {
    setIsReseeding(true)
    await fetch('/api/performance/reseed', { method: 'POST' })
    await load()
    setIsReseeding(false)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-24 app-card animate-pulse" />
        <div className="h-28 app-card animate-pulse" />
        <div className="h-64 app-card animate-pulse" />
      </div>
    )
  }

  if (!overview || !scoreboard || !rows) {
    return (
      <div className="app-card p-6">
        <p className="text-sm text-slate-500">Failed to load performance analytics.</p>
      </div>
    )
  }

  const selectedRows = rows.recommendations
  const hasData = overview.totals.snapshots > 0

  return (
    <div className="space-y-6">
      <div className="app-card p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Performance Proof</p>
            <h1 className="font-display text-2xl text-slate-900">Recommendation Outcomes</h1>
          </div>
          <div className="flex items-center gap-2">
            {isMockMode && (
              <button
                onClick={reseedMockData}
                disabled={isReseeding}
                className="px-4 py-2 rounded-full border border-slate-300 text-xs uppercase tracking-[0.16em] text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {isReseeding ? 'Reseeding...' : 'Reseed Mock Data'}
              </button>
            )}
            <button
              onClick={runEvaluation}
              disabled={isEvaluating}
              className="px-4 py-2 rounded-full border border-slate-300 text-xs uppercase tracking-[0.16em] text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {isEvaluating ? 'Evaluating...' : 'Run Evaluation'}
            </button>
          </div>
        </div>

        {hasData && (
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <MetricCard label="Snapshots" value={overview.totals.snapshots.toString()} />
            <MetricCard label="Evaluated" value={overview.totals.evaluated.toString()} />
            <MetricCard label="Pending" value={overview.totals.pending.toString()} />
            <MetricCard label="Scored" value={overview.totals.scored.toString()} />
            <MetricCard label="Stale" value={overview.totals.stale.toString()} />
          </div>
        )}
      </div>

      {!hasData && (
        <div className="app-card p-8 text-center space-y-4">
          <div className="text-4xl">📊</div>
          <h2 className="text-lg font-semibold text-slate-800">No performance data yet</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Add stocks to your portfolio, then generate AI recommendations from the portfolio page.
            Each recommendation is automatically tracked and scored over 1, 7, and 30 day horizons.
          </p>
          <a
            href="/portfolio"
            className="inline-block mt-2 px-5 py-2.5 rounded-full bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors"
          >
            Go to Portfolio
          </a>
        </div>
      )}

      <HowItWorks />

      {hasData && <>
      <div className="app-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-800">Horizon Metrics</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {[1, 7, 30].map((window) => {
            const stats = overview.horizons[window.toString()]
            return (
              <div key={window} className="app-card-muted p-4 space-y-2">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{window}d window</p>
                <p className="text-lg font-semibold text-slate-900">{stats?.count ?? 0} scored</p>
                <p className="text-xs text-slate-600">Win rate: {stats?.winRate !== null ? `${stats?.winRate?.toFixed(1)}%` : '—'}</p>
                <p className="text-xs text-slate-600">Avg return: {formatPct(stats?.avgReturn ?? null)}</p>
                <p className="text-xs text-slate-600">Median return: {formatPct(stats?.medianReturn ?? null)}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="app-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Confidence Calibration (7d)</h2>
          {overview.calibration.length === 0 ? (
            <p className="text-sm text-slate-500">No evaluated 7-day outcomes yet.</p>
          ) : (
            <div className="space-y-2">
              {overview.calibration.map((item) => (
                <div key={item.bucket} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span className="font-mono">{item.bucket}</span>
                    <span>{item.count} samples · {item.winRate !== null ? `${item.winRate.toFixed(1)}% win` : '—'}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-teal-500"
                      style={{ width: `${Math.max(4, (item.count / calibrationMax) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="app-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800">Data Quality</h2>
          <div className="space-y-2 text-sm text-slate-600">
            <p>OK: <span className="font-semibold text-slate-900">{overview.dataQuality.ok}</span></p>
            <p>Missing: <span className="font-semibold text-slate-900">{overview.dataQuality.missing}</span></p>
            <p>Stale: <span className="font-semibold text-slate-900">{overview.dataQuality.stale}</span></p>
          </div>
          <p className="text-xs text-slate-500">Missing values are excluded from win rate and return calculations.</p>
        </div>
      </div>

      <div className="app-card p-5 space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Strategy Scoreboard</h2>
          <div className="flex gap-1">
            {[1, 7, 30].map((window) => (
              <button
                key={window}
                onClick={() => setHorizon(window as Horizon)}
                className={`px-3 py-1 text-xs rounded-full border ${
                  horizon === window
                    ? 'border-slate-900 text-slate-900 bg-white'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {window}d
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <ScoreboardTable title="By Action" rows={scoreboard.scoreboards.action} />
          <ScoreboardTable title="By Risk Level" rows={scoreboard.scoreboards.riskLevel} />
          <ScoreboardTable title="By Confidence" rows={scoreboard.scoreboards.confidenceBucket} />
        </div>
      </div>

      <div className="app-card p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Recommendation Outcomes</h2>
          <div className="flex gap-1">
            {(['all', 'win', 'loss', 'pending'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setResult(filter)}
                className={`px-3 py-1 text-xs rounded-full border ${
                  result === filter
                    ? 'border-slate-900 text-slate-900 bg-white'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {selectedRows.length === 0 ? (
          <p className="text-sm text-slate-500">No rows match the current filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.18em] text-slate-400 border-b border-slate-100">
                  <th className="py-2 pr-3">Ticker</th>
                  <th className="py-2 pr-3">Action</th>
                  <th className="py-2 pr-3">Confidence</th>
                  <th className="py-2 pr-3">Entry</th>
                  <th className="py-2 pr-3">Return ({horizon}d)</th>
                  <th className="py-2 pr-3">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {selectedRows.map((row) => {
                  const evaluation = row.evaluations[horizon]
                  const outcome = !evaluation
                    ? 'Pending'
                    : evaluation.dataQuality !== 'ok'
                      ? 'Missing'
                      : evaluation.isWin
                        ? 'Win'
                        : 'Loss'

                  return (
                    <tr key={row.id} className="border-b border-slate-100/80">
                      <td className="py-2 pr-3 font-mono font-semibold text-slate-800">{row.ticker}</td>
                      <td className="py-2 pr-3 text-slate-600 uppercase text-xs">{row.action}</td>
                      <td className="py-2 pr-3 text-slate-600">{row.confidence}%</td>
                      <td className="py-2 pr-3 text-slate-600">{formatCurrency(row.entryPrice, row.currency)}</td>
                      <td className={`py-2 pr-3 ${
                        (evaluation?.returnPct ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        {formatPct(evaluation?.returnPct ?? null)}
                      </td>
                      <td className="py-2 pr-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${
                          outcome === 'Win'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : outcome === 'Loss'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}>
                          {outcome}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {rows.pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-sm border border-slate-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 text-slate-700"
            >
              Previous
            </button>
            <span className="text-sm text-slate-500">{page} / {rows.pagination.totalPages}</span>
            <button
              onClick={() => setPage((current) => Math.min(rows.pagination.totalPages, current + 1))}
              disabled={page === rows.pagination.totalPages}
              className="px-3 py-1 text-sm border border-slate-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 text-slate-700"
            >
              Next
            </button>
          </div>
        )}
      </div>
      </>}
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="app-card-muted p-3">
      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="text-xl font-semibold text-slate-900 mt-1">{value}</p>
    </div>
  )
}

function ScoreboardTable({ title, rows }: { title: string; rows: ScoreboardRow[] }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs uppercase tracking-[0.18em] text-slate-400">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-500">No data yet.</p>
      ) : (
        <div className="space-y-1">
          {rows.slice(0, 6).map((row) => (
            <div key={row.key} className="app-card-muted px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-xs text-slate-700">{row.key}</span>
                <span className="text-xs text-slate-500">{row.count} samples</span>
              </div>
              <div className="flex items-center justify-between mt-1 text-xs">
                <span className="text-slate-500">Win {row.winRate !== null ? `${row.winRate.toFixed(1)}%` : '—'}</span>
                <span className={(row.avgReturn ?? 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{formatPct(row.avgReturn)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function HowItWorks() {
  const [open, setOpen] = useState(false)
  return (
    <div className="app-card p-5">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-sm font-semibold text-slate-800"
      >
        <span>How does Performance Proof work?</span>
        <span className="text-slate-400 text-xs">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <div className="mt-4 space-y-4 text-sm text-slate-600 leading-relaxed">
          <div>
            <h3 className="font-semibold text-slate-800 mb-1">The idea</h3>
            <p>
              Most AI-powered investment tools make predictions but never tell you if they were right.
              Performance Proof is different: every recommendation the AI makes is recorded with a timestamp
              and the stock price at that moment. Then we check back later to see what actually happened.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-800 mb-1">How it works, step by step</h3>
            <ol className="list-decimal list-inside space-y-1.5">
              <li>You add stocks to your <span className="font-medium">Portfolio</span></li>
              <li>The AI analyses your holdings and generates <span className="font-medium">buy</span>, <span className="font-medium">sell</span>, or <span className="font-medium">hold</span> recommendations with a confidence percentage</li>
              <li>Each recommendation is <span className="font-medium">snapshotted</span> — we record the stock price, the action, and the confidence</li>
              <li>After <span className="font-medium">1 day</span>, <span className="font-medium">7 days</span>, and <span className="font-medium">30 days</span>, we look up the actual stock price and calculate whether the recommendation was right</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold text-slate-800 mb-1">What counts as a win?</h3>
            <ul className="list-disc list-inside space-y-1">
              <li><span className="font-medium">Buy</span> wins if the stock went up</li>
              <li><span className="font-medium">Sell</span> wins if the stock went down</li>
              <li><span className="font-medium">Hold</span> wins if the stock stayed within 2% (it was right that nothing dramatic would happen)</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-slate-800 mb-1">What you see on this page</h3>
            <ul className="list-disc list-inside space-y-1">
              <li><span className="font-medium">Horizon Metrics</span> — overall win rate and average returns across the 1d, 7d, and 30d checkpoints</li>
              <li><span className="font-medium">Confidence Calibration</span> — is the AI accurate when it says it&apos;s 80% confident vs 60%? The bars show how many samples exist per confidence range</li>
              <li><span className="font-medium">Strategy Scoreboard</span> — performance broken down by action type (buy/sell/hold), risk level (safe/interesting/spicy), and confidence bucket</li>
              <li><span className="font-medium">Recommendation Outcomes</span> — the raw table of every recommendation, its entry price, return, and whether it was a win or loss</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-slate-800 mb-1">Statuses explained</h3>
            <ul className="list-disc list-inside space-y-1">
              <li><span className="font-medium">Pending</span> — not enough time has passed to score all three horizons yet</li>
              <li><span className="font-medium">Scored</span> — all three checkpoints have been evaluated with real price data</li>
              <li><span className="font-medium">Stale</span> — we tried to evaluate but couldn&apos;t find reliable price data for some checkpoints (e.g. market was closed, data gap)</li>
            </ul>
          </div>

          <p className="text-xs text-slate-400 pt-2 border-t border-slate-100">
            Evaluation runs automatically when you visit this page. You can also click &quot;Run Evaluation&quot; to manually trigger it.
            The more recommendations you generate over time, the more meaningful these metrics become.
          </p>
        </div>
      )}
    </div>
  )
}
