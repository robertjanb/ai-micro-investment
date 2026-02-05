'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Message } from './Message'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface ChatInterfaceProps {
  initialMessages?: ChatMessage[]
  conversationId?: string
  quickPrompts?: string[]
}

export function ChatInterface({
  initialMessages = [],
  conversationId: initialConversationId,
  quickPrompts = [],
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState(initialConversationId)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const trimmed = input.trim()
      if (!trimmed || isLoading) return

      if (trimmed.length > 2000) {
        setError('Message cannot exceed 2000 characters')
        return
      }

      setError(null)
      const userMessage: ChatMessage = {
        id: `user-${crypto.randomUUID()}`,
        role: 'user',
        content: trimmed,
      }

      setMessages((prev) => [...prev, userMessage])
      setInput('')
      setIsLoading(true)

      // Create assistant message placeholder for streaming
      const assistantId = `assistant-${crypto.randomUUID()}`
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '' },
      ])

      try {
        abortRef.current = new AbortController()
        timeoutRef.current = setTimeout(() => {
          abortRef.current?.abort()
        }, 30000)

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: trimmed }],
            conversationId,
          }),
          signal: abortRef.current.signal,
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to send message')
        }

        // Read conversation ID from header
        const convId = res.headers.get('X-Conversation-Id')
        if (convId) {
          setConversationId(convId)
        }

        const data = await res.json().catch(() => ({}))
        if (!data?.text) {
          throw new Error('Empty response from server')
        }

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? { ...msg, content: data.text as string }
              : msg
          )
        )
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          setError('Response timed out. Please try again.')
          setMessages((prev) => prev.filter((m) => m.id !== assistantId || m.content))
          return
        }
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'I\'m having trouble connecting right now. Please try again in a moment.'
        setError(errorMessage)
        // Remove empty assistant message on error
        setMessages((prev) => prev.filter((m) => m.id !== assistantId || m.content))
      } finally {
        setIsLoading(false)
        abortRef.current = null
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
        inputRef.current?.focus()
      }
    },
    [input, isLoading, conversationId]
  )

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const charCount = input.length
  const overLimit = charCount > 2000

  return (
    <div className="flex flex-col min-h-[520px] h-[calc(100vh-22rem)] min-h-0">
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && !isLoading && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 p-4 text-sm text-slate-600">
            Ask about an idea, compare tickers, or request a bear case.
          </div>
        )}
        {messages.map((msg) => (
          <Message key={msg.id} role={msg.role} content={msg.content} />
        ))}
        {isLoading && messages[messages.length - 1]?.content === '' && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
              Thinking...
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="text-sm text-rose-600 mb-2">
          {error}
        </div>
      )}

      {quickPrompts.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 mb-2">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => {
                setInput(prompt)
                inputRef.current?.focus()
              }}
              className="shrink-0 text-xs text-slate-600 border border-slate-200 rounded-full px-3 py-1 bg-white hover:border-slate-300 hover:text-slate-900"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about an investment idea..."
          rows={1}
          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-sm"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim() || overLimit}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          Send
        </button>
      </form>
      <div className={`text-xs mt-1 ${overLimit ? 'text-rose-500' : 'text-slate-400'}`}>
        {charCount}/2000 characters
      </div>
    </div>
  )
}
