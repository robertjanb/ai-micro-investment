import { NextResponse } from 'next/server'
import { compare } from 'bcryptjs'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const deleteSchema = z.object({
  password: z.string().min(1),
})

export async function DELETE(req: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = deleteSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      )
    }
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const isValid = await compare(parsed.data.password, user.passwordHash)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Incorrect password' },
        { status: 403 }
      )
    }

    // Cascade delete handles Conversations, Messages, WatchlistItems
    await prisma.user.delete({
      where: { id: session.user.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Account deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    )
  }
}
