interface MessageProps {
  role: 'user' | 'assistant'
  content: string
}

export function Message({ role, content }: MessageProps) {
  const isUser = role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[82%] space-y-1">
        <div className={`text-[10px] uppercase tracking-[0.2em] ${isUser ? 'text-slate-400 text-right' : 'text-slate-400'}`}>
          {isUser ? 'You' : 'Analyst'}
        </div>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap border ${
            isUser
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-800 border-slate-200 shadow-sm'
          }`}
        >
          {content}
        </div>
      </div>
    </div>
  )
}
