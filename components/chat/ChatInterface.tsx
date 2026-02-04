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
}

export function ChatInterface({
  initialMessages = [],
  conversationId: initialConversationId,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState(initialConversationId)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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

        // Stream the response
        const reader = res.body?.getReader()
        if (!reader) throw new Error('No response stream')

        const decoder = new TextDecoder()
        let accumulated = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          accumulated += decoder.decode(value, { stream: true })

          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId
                ? { ...msg, content: accumulated }
                : msg
            )
          )
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
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
    <div className="flex flex-col h-[calc(100vh-16rem)]">
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
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
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 mb-2">
          {error}
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
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim() || overLimit}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          Send
        </button>
      </form>
      <div className={`text-xs mt-1 ${overLimit ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`}>
        {charCount}/2000 characters
      </div>
    </div>
  )
}
