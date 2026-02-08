import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { YahooPriceProvider } from '@/lib/data-sources'
import { checkRateLimit, PORTFOLIO_QUOTE_RATE_LIMIT } from '@/lib/rate-limit'

const priceProvider = new YahooPriceProvider()

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rateCheck = checkRateLimit(`portfolio:quote:${session.user.id}`, PORTFOLIO_QUOTE_RATE_LIMIT)
  if (!rateCheck.allowed) {
    const retryAfterSeconds = Math.ceil((rateCheck.resetAt - Date.now()) / 1000)
    return NextResponse.json(
      { error: 'Too many quote requests. Please wait a moment.' },
      { status: 429, headers: { 'Retry-After': retryAfterSeconds.toString() } }
    )
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
