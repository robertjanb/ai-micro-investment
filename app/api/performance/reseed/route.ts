import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { isPerformanceProofEnabled } from '@/lib/performance'
import { ensureMockPerformanceHistory } from '@/lib/mock/performance-history'

export async function POST() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isPerformanceProofEnabled()) {
    return NextResponse.json({ error: 'Performance proof is disabled' }, { status: 503 })
  }

  if (process.env.DATA_SOURCE !== 'mock') {
    return NextResponse.json(
      { error: 'Reseed is only available in mock mode' },
      { status: 400 }
    )
  }

  try {
    await ensureMockPerformanceHistory(session.user.id, { force: true, minSnapshots: 40 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to reseed mock performance history:', error)
    return NextResponse.json({ error: 'Failed to reseed mock data' }, { status: 500 })
  }
}
