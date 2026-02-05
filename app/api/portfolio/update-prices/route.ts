import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { YahooPriceProvider } from '@/lib/data-sources'

const priceProvider = new YahooPriceProvider()

// Update prices for a specific user's holdings
export async function POST(req: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await updateUserHoldingPrices(session.user.id)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to update prices:', error)
    return NextResponse.json({ error: 'Failed to update prices' }, { status: 500 })
  }
}

// Cron endpoint - updates all users' holdings
// Secure with a secret key for external cron services
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const cronSecret = searchParams.get('secret')

  // Allow authenticated users or cron with secret
  const session = await getSession()
  const isValidCron = cronSecret && cronSecret === process.env.CRON_SECRET

  if (!session && !isValidCron) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // If user is authenticated, only update their holdings
    if (session) {
      const result = await updateUserHoldingPrices(session.user.id)
      return NextResponse.json(result)
    }

    // Cron job: update all users' holdings
    const users = await prisma.user.findMany({
      select: { id: true },
    })

    let totalUpdated = 0
    let totalFailed = 0

    for (const user of users) {
      const result = await updateUserHoldingPrices(user.id)
      totalUpdated += result.updated
      totalFailed += result.failed
    }

    return NextResponse.json({
      success: true,
      usersProcessed: users.length,
      totalUpdated,
      totalFailed,
    })
  } catch (error) {
    console.error('Cron price update failed:', error)
    return NextResponse.json({ error: 'Failed to update prices' }, { status: 500 })
  }
}

async function updateUserHoldingPrices(userId: string) {
  const holdings = await prisma.holding.findMany({
    where: { userId },
    select: { id: true, ticker: true, updatedAt: true },
  })

  if (holdings.length === 0) {
    return { updated: 0, failed: 0, holdings: [] }
  }

  // Get unique tickers
  const tickers = Array.from(new Set(holdings.map((h) => h.ticker)))

  // Fetch current prices
  const priceMap = new Map<string, number>()

  for (const ticker of tickers) {
    try {
      const price = await priceProvider.getCurrentPrice(ticker)
      priceMap.set(ticker, price)
    } catch (error) {
      console.error(`Failed to fetch price for ${ticker}:`, error)
    }
  }

  // Update holdings with new prices
  let updated = 0
  let failed = 0
  const updatedHoldings: Array<{ id: string; ticker: string; oldPrice: number; newPrice: number }> = []

  for (const holding of holdings) {
    const newPrice = priceMap.get(holding.ticker)
    if (newPrice !== undefined) {
      try {
        const oldHolding = await prisma.holding.findUnique({
          where: { id: holding.id },
          select: { currentPrice: true },
        })

        await prisma.holding.update({
          where: { id: holding.id },
          data: { currentPrice: newPrice },
        })

        updatedHoldings.push({
          id: holding.id,
          ticker: holding.ticker,
          oldPrice: oldHolding?.currentPrice ?? 0,
          newPrice,
        })
        updated++
      } catch (error) {
        console.error(`Failed to update holding ${holding.id}:`, error)
        failed++
      }
    } else {
      failed++
    }
  }

  return { updated, failed, holdings: updatedHoldings }
}
