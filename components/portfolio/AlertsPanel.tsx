'use client'

interface AlertItem {
  id: string
  title: string
  description: string
  tone: 'info' | 'warning' | 'negative' | 'positive'
}

const TONE_STYLES: Record<AlertItem['tone'], { bg: string; border: string; text: string }> = {
  info: {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    text: 'text-slate-700',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
  },
  negative: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-800',
  },
  positive: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-800',
  },
}

export function AlertsPanel({ alerts }: { alerts: AlertItem[] }) {
  return (
    <div className="app-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Alerts
          </h3>
          <div className="text-sm text-slate-600">
            {alerts.length === 0 ? 'All clear' : `${alerts.length} active`}
          </div>
        </div>
        <span className="app-pill">{alerts.length}</span>
      </div>

      {alerts.length === 0 ? (
        <div className="text-sm text-slate-500">
          No portfolio alerts right now.
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => {
            const styles = TONE_STYLES[alert.tone]
            return (
              <div
                key={alert.id}
                className={`rounded-2xl border px-3 py-2 ${styles.bg} ${styles.border}`}
              >
                <div className={`text-[11px] uppercase tracking-[0.2em] ${styles.text}`}>
                  {alert.title}
                </div>
                <div className="text-sm text-slate-700">
                  {alert.description}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
