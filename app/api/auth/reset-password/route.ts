import { NextResponse } from 'next/server'
import { hash } from 'bcryptjs'
import { randomBytes, createHash } from 'crypto'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { checkRateLimit } from '@/lib/rate-limit'

const requestSchema = z.object({
  email: z.string().email().transform((e) => e.toLowerCase().trim()),
})

const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
})

const RESET_RATE_LIMIT = { maxRequests: 3, windowMs: 60000 }

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const result = requestSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid email' },
        { status: 400 }
      )
    }

    const forwarded = req.headers.get('x-forwarded-for')
    const ip = forwarded?.split(',')[0]?.trim() || 'unknown'
    const rateCheck = checkRateLimit(`auth:reset:${ip}`, RESET_RATE_LIMIT)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429 }
      )
    }

    const { email } = result.data

    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (user) {
      const rawToken = randomBytes(32).toString('hex')
      const resetTokenExp = new Date(Date.now() + 3600000)

      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken: hashToken(rawToken),
          resetTokenExp,
        },
      })

      // In production, send this via email service
      if (process.env.NODE_ENV === 'development') {
        const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${rawToken}`
        console.log(`[DEV ONLY] Password reset URL: ${resetUrl}`)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Password reset request error:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const result = resetSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      )
    }

    const { token, password } = result.data
    const tokenHash = hashToken(token)

    const user = await prisma.user.findFirst({
      where: {
        resetToken: tokenHash,
        resetTokenExp: {
          gt: new Date(),
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }

    const passwordHash = await hash(password, 12)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExp: null,
        tokenVersion: { increment: 1 },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    )
  }
}
