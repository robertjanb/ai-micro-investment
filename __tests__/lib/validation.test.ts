import {
  chatMessageSchema,
  streamingChatSchema,
} from '@/lib/validation'

describe('chatMessageSchema', () => {
  it('accepts valid message', () => {
    const result = chatMessageSchema.safeParse({
      message: 'Hello, tell me about investing',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty message', () => {
    const result = chatMessageSchema.safeParse({ message: '' })
    expect(result.success).toBe(false)
  })

  it('rejects messages over 2000 chars', () => {
    const result = chatMessageSchema.safeParse({
      message: 'x'.repeat(2001),
    })
    expect(result.success).toBe(false)
  })

  it('accepts messages at exactly 2000 chars', () => {
    const result = chatMessageSchema.safeParse({
      message: 'x'.repeat(2000),
    })
    expect(result.success).toBe(true)
  })

  it('strips HTML from message', () => {
    const result = chatMessageSchema.safeParse({
      message: '<script>alert("xss")</script>Hello',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.message).toBe('alert("xss")Hello')
      expect(result.data.message).not.toContain('<script>')
    }
  })

  it('accepts optional conversationId', () => {
    const result = chatMessageSchema.safeParse({
      message: 'Hello',
      conversationId: 'conv-123',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.conversationId).toBe('conv-123')
    }
  })

  it('works without conversationId', () => {
    const result = chatMessageSchema.safeParse({
      message: 'Hello',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.conversationId).toBeUndefined()
    }
  })
})

describe('streamingChatSchema', () => {
  it('accepts valid streaming payload', () => {
    const result = streamingChatSchema.safeParse({
      messages: [{ role: 'user', content: 'Hello' }],
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty messages array', () => {
    const result = streamingChatSchema.safeParse({
      messages: [],
    })
    expect(result.success).toBe(false)
  })

  it('accepts multiple messages', () => {
    const result = streamingChatSchema.safeParse({
      messages: [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi' },
        { role: 'user', content: 'How are you?' },
      ],
      conversationId: 'conv-123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid role', () => {
    const result = streamingChatSchema.safeParse({
      messages: [{ role: 'admin', content: 'Hello' }],
    })
    expect(result.success).toBe(false)
  })
})
