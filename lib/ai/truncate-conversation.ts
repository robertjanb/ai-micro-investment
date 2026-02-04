interface Message {
  role: 'user' | 'assistant'
  content: string
}

const MAX_CONTEXT_CHARS = 150000 // ~80% of Claude's context window
const SYSTEM_PROMPT_BUFFER = 10000

export function truncateConversation(
  messages: Message[],
  systemPromptLength: number = 0
): Message[] {
  const availableChars = MAX_CONTEXT_CHARS - systemPromptLength - SYSTEM_PROMPT_BUFFER

  let totalChars = 0
  const keptMessages: Message[] = []

  // Keep messages from newest to oldest
  for (let i = messages.length - 1; i >= 0; i--) {
    const msgChars = messages[i].content.length
    if (totalChars + msgChars > availableChars) {
      break
    }
    totalChars += msgChars
    keptMessages.unshift(messages[i])
  }

  // Ensure we keep at least the last message
  if (keptMessages.length === 0 && messages.length > 0) {
    const last = messages[messages.length - 1]
    keptMessages.push({
      role: last.role,
      content: last.content.slice(0, availableChars),
    })
  }

  // If we truncated, add a context note at the start
  if (keptMessages.length < messages.length && keptMessages.length > 0) {
    const droppedCount = messages.length - keptMessages.length
    keptMessages.unshift({
      role: 'assistant',
      content: `[Earlier conversation truncated — ${droppedCount} messages omitted for context limits]`,
    })
  }

  return keptMessages
}
