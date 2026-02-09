const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
const MODEL = process.env.AI_MODEL || 'anthropic/claude-sonnet-4-20250514'

const MAX_RETRIES = 3
const BASE_DELAY = 1000

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
  error?: {
    message: string
    code: number
  }
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: Error | undefined

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY * Math.pow(2, attempt)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}

export async function getChatCompletion(
  messages: ChatMessage[],
  systemPrompt?: string,
  options?: { temperature?: number }
): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not configured')
  }

  return withRetry(async () => {
    const allMessages: ChatMessage[] = []

    if (systemPrompt) {
      allMessages.push({ role: 'system', content: systemPrompt })
    }

    allMessages.push(
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))
    )

    const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
        'X-Title': 'AI Micro-Investment Companion',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4096,
        temperature: options?.temperature ?? 0.7,
        messages: allMessages,
      }),
    })

    if (!res.ok) {
      const errorBody = await res.text()
      throw new Error(`OpenRouter API error (${res.status}): ${errorBody}`)
    }

    const data: OpenRouterResponse = await res.json()

    if (data.error) {
      throw new Error(`OpenRouter error: ${data.error.message}`)
    }

    const content = data.choices?.[0]?.message?.content
    if (!content) {
      throw new Error('No response content from AI')
    }

    return content
  })
}
