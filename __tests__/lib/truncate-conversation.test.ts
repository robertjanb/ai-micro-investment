import { truncateConversation } from '@/lib/ai/truncate-conversation'

describe('truncateConversation', () => {
  it('returns all messages when within limit', () => {
    const messages = [
      { role: 'user' as const, content: 'Hello' },
      { role: 'assistant' as const, content: 'Hi there' },
    ]

    const result = truncateConversation(messages)
    expect(result).toEqual(messages)
  })

  it('keeps most recent messages when truncation needed', () => {
    // Create messages that exceed the limit
    const longContent = 'x'.repeat(100000)
    const messages = [
      { role: 'user' as const, content: longContent },
      { role: 'assistant' as const, content: longContent },
      { role: 'user' as const, content: 'Recent message' },
    ]

    const result = truncateConversation(messages)

    // Should keep the recent short message and add truncation note
    const lastMsg = result[result.length - 1]
    expect(lastMsg.content).toBe('Recent message')
  })

  it('adds truncation note when messages are dropped', () => {
    const longContent = 'x'.repeat(100000)
    const messages = [
      { role: 'user' as const, content: longContent },
      { role: 'assistant' as const, content: longContent },
      { role: 'user' as const, content: 'Short message' },
    ]

    const result = truncateConversation(messages)

    // First message should be the truncation note
    expect(result[0].role).toBe('assistant')
    expect(result[0].content).toContain('truncated')
    expect(result[0].content).toContain('omitted')
  })

  it('always keeps at least the last message', () => {
    const veryLong = 'x'.repeat(200000)
    const messages = [{ role: 'user' as const, content: veryLong }]

    const result = truncateConversation(messages)
    expect(result.length).toBe(1)
    expect(result[0].role).toBe('user')
  })

  it('accounts for system prompt length', () => {
    const content = 'x'.repeat(70000)
    const messages = [
      { role: 'user' as const, content },
      { role: 'assistant' as const, content },
      { role: 'user' as const, content: 'Recent' },
    ]

    // With a large system prompt, fewer messages should fit
    const withSmallPrompt = truncateConversation(messages, 1000)
    const withLargePrompt = truncateConversation(messages, 80000)

    expect(withLargePrompt.length).toBeLessThanOrEqual(withSmallPrompt.length)
  })

  it('returns empty array for empty input', () => {
    const result = truncateConversation([])
    expect(result).toEqual([])
  })
})
