import { NextResponse } from 'next/server'
import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { CONVERSATION_SYSTEM_PROMPT, contextualizeIdeasPrompt } from '@/lib/ai/prompts'
import { truncateConversation } from '@/lib/ai/truncate-conversation'
import { streamingChatSchema } from '@/lib/validation'
import { checkRateLimit, CHAT_RATE_LIMIT } from '@/lib/rate-limit'

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
  headers: {
    'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
    'X-Title': 'AI Micro-Investment Companion',
  },
})

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rateCheck = checkRateLimit(`chat:${session.user.id}`, CHAT_RATE_LIMIT)
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'You\'re sending messages too quickly. Please wait a moment.' },
      { status: 429 }
    )
  }

  try {
    const body = await req.json()
    const parsed = streamingChatSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    // Extract the last user message from useChat's messages array
    const lastUserMsg = [...parsed.data.messages].reverse().find((m) => m.role === 'user')
    if (!lastUserMsg || lastUserMsg.content.length > 2000) {
      return NextResponse.json(
        { error: lastUserMsg ? 'Message cannot exceed 2000 characters' : 'No user message found' },
        { status: 400 }
      )
    }

    const message = lastUserMsg.content.replace(/<[^>]*>/g, '')
    const conversationId = parsed.data.conversationId

    // Get or create conversation
    let conversation
    if (conversationId) {
      conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId: session.user.id },
        include: { messages: { orderBy: { createdAt: 'asc' }, take: 100 } },
      })
    }

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { userId: session.user.id },
        include: { messages: true },
      })
    }

    // Save user message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: message,
      },
    })

    // Build message history from DB
    const history = conversation.messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))
    history.push({ role: 'user', content: message })

    // Get today's ideas for context
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todaysIdeas = await prisma.idea.findMany({
      where: { generatedDate: today },
      select: { ticker: true, companyName: true, oneLiner: true },
    })

    // Build system prompt with idea context
    let systemPrompt = CONVERSATION_SYSTEM_PROMPT
    if (todaysIdeas.length > 0) {
      systemPrompt += contextualizeIdeasPrompt(todaysIdeas)
    }

    // Truncate conversation to fit context
    const truncated = truncateConversation(history, systemPrompt.length)

    const model = process.env.AI_MODEL || 'anthropic/claude-sonnet-4-20250514'
    const convId = conversation.id

    // Stream response
    const result = streamText({
      model: openrouter(model),
      system: systemPrompt,
      messages: truncated.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      onFinish: async ({ text }) => {
        // Save assistant message after stream completes
        await prisma.message.create({
          data: {
            conversationId: convId,
            role: 'assistant',
            content: text,
          },
        })
      },
    })

    return result.toTextStreamResponse({
      headers: {
        'X-Conversation-Id': convId,
      },
    })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: 'I\'m having trouble connecting right now. Please try again in a moment.' },
      { status: 500 }
    )
  }
}
