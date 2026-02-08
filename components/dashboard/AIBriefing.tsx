'use client'

interface AIBriefingProps {
  briefing: string
  loading: boolean
}

export function AIBriefing({ briefing, loading }: AIBriefingProps) {
  if (loading) {
    return (
      <div className="app-card p-5 space-y-3">
        <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
          AI Briefing
        </span>
        <div className="space-y-2 animate-pulse">
          <div className="h-3 bg-slate-100 rounded w-full" />
          <div className="h-3 bg-slate-100 rounded w-11/12" />
          <div className="h-3 bg-slate-100 rounded w-4/5" />
          <div className="h-3 bg-slate-100 rounded w-full" />
          <div className="h-3 bg-slate-100 rounded w-3/4" />
        </div>
        <p className="text-[10px] text-slate-300 tracking-wide">
          Generating briefing...
        </p>
      </div>
    )
  }

  if (!briefing) {
    return null
  }

  return (
    <div className="app-card p-5 space-y-3">
      <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
        AI Briefing
      </span>
      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
        {briefing}
      </p>
    </div>
  )
}
