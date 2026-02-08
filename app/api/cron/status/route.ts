import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const DEFAULT_CRON_NAME = 'portfolio-price-update'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const name = searchParams.get('name') || DEFAULT_CRON_NAME

  try {
    const status = await prisma.cronJobStatus.findUnique({
      where: { name },
    })

    return NextResponse.json({ status })
  } catch (error) {
    console.error('Failed to fetch cron status:', error)
    return NextResponse.json({ error: 'Failed to fetch cron status' }, { status: 500 })
  }
}
