import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateHoldingSchema = z.object({
  quantity: z.number().positive().optional(),
  purchasePrice: z.number().positive().optional(),
  currentPrice: z.number().positive().optional(),
  notes: z.string().optional().nullable(),
})

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const holding = await prisma.holding.findUnique({
      where: { id: params.id },
    })

    if (!holding) {
      return NextResponse.json({ error: 'Holding not found' }, { status: 404 })
    }

    if (holding.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = updateHoldingSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      )
    }

    const updated = await prisma.holding.update({
      where: { id: params.id },
      data: {
        ...(parsed.data.quantity !== undefined && { quantity: parsed.data.quantity }),
        ...(parsed.data.purchasePrice !== undefined && { purchasePrice: parsed.data.purchasePrice }),
        ...(parsed.data.currentPrice !== undefined && { currentPrice: parsed.data.currentPrice }),
        ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
      },
    })

    return NextResponse.json({ holding: updated })
  } catch (error) {
    console.error('Failed to update holding:', error)
    return NextResponse.json({ error: 'Failed to update holding' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const holding = await prisma.holding.findUnique({
      where: { id: params.id },
    })

    if (!holding) {
      return NextResponse.json({ error: 'Holding not found' }, { status: 404 })
    }

    if (holding.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await prisma.holding.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete holding:', error)
    return NextResponse.json({ error: 'Failed to delete holding' }, { status: 500 })
  }
}
