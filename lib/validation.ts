import { z } from 'zod'

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '')
}

export const chatMessageSchema = z.object({
  message: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message cannot exceed 2000 characters')
    .transform(stripHtml),
  conversationId: z.string().optional(),
})

const useChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
})

export const streamingChatSchema = z.object({
  messages: z.array(useChatMessageSchema).min(1),
  conversationId: z.string().optional(),
})

export const emailSchema = z
  .string()
  .email('Invalid email format')
  .min(1, 'Email is required')

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const dateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
})

export type ChatMessageInput = z.infer<typeof chatMessageSchema>
export type PaginationInput = z.infer<typeof paginationSchema>
