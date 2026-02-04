import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const idea = await prisma.idea.findUnique({
      where: { id: params.id },
      include: {
        priceHistory: {
          orderBy: { timestamp: 'asc' },
        },
      },
    })

    if (!idea) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
    }

    return NextResponse.json({ idea })
  } catch (error) {
    console.error('Failed to fetch idea:', error)
    return NextResponse.json(
      { error: 'Failed to load idea details' },
      { status: 500 }
    )
  }
}
