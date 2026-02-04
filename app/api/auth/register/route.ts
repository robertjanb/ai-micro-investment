import { NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rate-limit'

const registerSchema = z.object({
  email: z.string().email('Invalid email format').transform((e) => e.toLowerCase().trim()),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

const AUTH_RATE_LIMIT = { maxRequests: 5, windowMs: 60000 }

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const result = registerSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const forwarded = req.headers.get('x-forwarded-for')
    const ip = forwarded?.split(',')[0]?.trim() || 'unknown'
    const rateCheck = checkRateLimit(`auth:register:${ip}`, AUTH_RATE_LIMIT)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429 }
      )
    }

    const { email, password } = result.data

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      // Return success to prevent account enumeration
      return NextResponse.json({ success: true })
    }

    const passwordHash = await hash(password, 12)

    await prisma.user.create({
      data: {
        email,
        passwordHash,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    )
  }
}
