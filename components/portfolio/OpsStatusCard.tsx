'use client'

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

interface OpsStatusCardProps {
  pricesUpdatedAt: string | null
  pricesStale: boolean
  cronStatus: CronStatus | null
  formatRelativeTime: (dateStr: string | null) => string | null
}

function getCronState(status: CronStatus | null) {
  if (!status) {
    return { label: 'Unknown', tone: 'bg-slate-100 text-slate-600' }
  }
  if (status.lastError) {
    return { label: 'Failed', tone: 'bg-rose-100 text-rose-700' }
  }
  if (!status.lastRunAt) {
    return { label: 'Never Run', tone: 'bg-slate-100 text-slate-600' }
  }
  if (!status.lastSuccessAt) {
    return { label: 'Pending', tone: 'bg-amber-100 text-amber-700' }
  }
  return { label: 'Healthy', tone: 'bg-emerald-100 text-emerald-700' }
}

export function OpsStatusCard({
  pricesUpdatedAt,
  pricesStale,
  cronStatus,
  formatRelativeTime,
}: OpsStatusCardProps) {
  const cronState = getCronState(cronStatus)
  const summary = cronStatus?.lastSummary

  return (
    <div className="app-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Ops Status
          </h3>
          <div className="text-sm text-slate-600">
            Price updates & cron health
          </div>
        </div>
        <span className={`text-xs uppercase tracking-[0.2em] px-3 py-1 rounded-full ${cronState.tone}`}>
          {cronState.label}
        </span>
      </div>

      <div className="space-y-2 text-sm text-slate-700">
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Prices updated</span>
          <span>{formatRelativeTime(pricesUpdatedAt) || 'never'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Prices stale</span>
          <span>{pricesStale ? 'Yes' : 'No'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Cron last run</span>
          <span>{formatRelativeTime(cronStatus?.lastRunAt || null) || 'never'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500">Cron last success</span>
          <span>{formatRelativeTime(cronStatus?.lastSuccessAt || null) || 'never'}</span>
        </div>
        {summary && (
          <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            {typeof summary.usersProcessed === 'number' && (
              <div>Users: {summary.usersProcessed}</div>
            )}
            {typeof summary.totalUpdated === 'number' && (
              <div>Updated: {summary.totalUpdated}</div>
            )}
            {typeof summary.totalFailed === 'number' && (
              <div>Failed: {summary.totalFailed}</div>
            )}
            {typeof summary.totalSkipped === 'number' && (
              <div>Skipped: {summary.totalSkipped}</div>
            )}
          </div>
        )}
        {cronStatus?.lastError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {cronStatus.lastError}
          </div>
        )}
      </div>
    </div>
  )
}
