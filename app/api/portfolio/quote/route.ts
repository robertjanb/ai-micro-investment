import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { YahooPriceProvider } from '@/lib/data-sources'

const priceProvider = new YahooPriceProvider()

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const ticker = searchParams.get('ticker')

  if (!ticker) {
    return NextResponse.json({ error: 'Ticker is required' }, { status: 400 })
  }

  try {
    const quote = await priceProvider.getQuoteInfo(ticker.toUpperCase())

    if (!quote) {
      return NextResponse.json({ error: 'Ticker not found' }, { status: 404 })
    }

    return NextResponse.json({ quote })
  } catch (error) {
    console.error('Failed to fetch quote:', error)
    return NextResponse.json({ error: 'Failed to fetch quote' }, { status: 500 })
  }
}
