import {
  CONVERSATION_SYSTEM_PROMPT,
  ideaGenerationPrompt,
  contextualizeIdeasPrompt,
} from '@/lib/ai/prompts'

describe('CONVERSATION_SYSTEM_PROMPT', () => {
  it('defines the senior finance consultant persona', () => {
    expect(CONVERSATION_SYSTEM_PROMPT).toContain('senior finance consultant')
  })

  it('prohibits emojis and hype language', () => {
    expect(CONVERSATION_SYSTEM_PROMPT).toContain('Never use emojis')
    expect(CONVERSATION_SYSTEM_PROMPT).toContain('hype language')
  })

  it('includes pushback behavior', () => {
    expect(CONVERSATION_SYSTEM_PROMPT).toContain('Push back on impulsive decisions')
  })

  it('requires transparency about uncertainty', () => {
    expect(CONVERSATION_SYSTEM_PROMPT).toContain('Admit uncertainty')
  })

  it('reminds that data is simulated', () => {
    expect(CONVERSATION_SYSTEM_PROMPT).toContain('simulated')
  })
})

describe('ideaGenerationPrompt', () => {
  it('requests the specified number of ideas', () => {
    const prompt = ideaGenerationPrompt(5)
    expect(prompt).toContain('Generate 5 fictional')
  })

  it('specifies JSON output format', () => {
    const prompt = ideaGenerationPrompt(3)
    expect(prompt).toContain('valid JSON')
    expect(prompt).toContain('"ticker"')
    expect(prompt).toContain('"confidenceScore"')
    expect(prompt).toContain('"signals"')
  })

  it('requires fictional tickers', () => {
    const prompt = ideaGenerationPrompt(3)
    expect(prompt).toContain('fictional')
  })

  it('specifies risk level options', () => {
    const prompt = ideaGenerationPrompt(3)
    expect(prompt).toContain('"safe"')
    expect(prompt).toContain('"interesting"')
    expect(prompt).toContain('"spicy"')
  })
})

describe('contextualizeIdeasPrompt', () => {
  it('formats ideas into a list', () => {
    const ideas = [
      { ticker: 'TST', companyName: 'Test Corp', oneLiner: 'Test idea' },
    ]
    const result = contextualizeIdeasPrompt(ideas)
    expect(result).toContain('TST')
    expect(result).toContain('Test Corp')
    expect(result).toContain('Test idea')
  })

  it('handles multiple ideas', () => {
    const ideas = [
      { ticker: 'AAA', companyName: 'Alpha', oneLiner: 'First' },
      { ticker: 'BBB', companyName: 'Beta', oneLiner: 'Second' },
    ]
    const result = contextualizeIdeasPrompt(ideas)
    expect(result).toContain('AAA')
    expect(result).toContain('BBB')
  })
})
