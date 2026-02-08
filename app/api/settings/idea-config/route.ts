import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getIdeaConfig, invalidateIdeaConfigCache, DEFAULT_IDEA_CONFIG } from '@/lib/idea-config'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const config = await getIdeaConfig()
  return NextResponse.json(config)
}

const VALID_MARKETS = ['US', 'DE', 'FR', 'NL', 'GB']
const VALID_RISK_LEVELS = ['safe', 'interesting', 'spicy']

export async function PUT(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validate markets
  if (body.markets !== undefined) {
    if (!Array.isArray(body.markets) || body.markets.length === 0) {
      return NextResponse.json({ error: 'At least one market is required' }, { status: 400 })
    }
    const invalidMarkets = (body.markets as string[]).filter((m) => !VALID_MARKETS.includes(m))
    if (invalidMarkets.length > 0) {
      return NextResponse.json({ error: `Invalid markets: ${invalidMarkets.join(', ')}` }, { status: 400 })
    }
  }

  // Validate risk levels
  if (body.riskLevels !== undefined) {
    if (!Array.isArray(body.riskLevels)) {
      return NextResponse.json({ error: 'riskLevels must be an array' }, { status: 400 })
    }
    const invalidLevels = (body.riskLevels as string[]).filter((r) => !VALID_RISK_LEVELS.includes(r))
    if (invalidLevels.length > 0) {
      return NextResponse.json({ error: `Invalid risk levels: ${invalidLevels.join(', ')}` }, { status: 400 })
    }
  }

  // Validate numeric fields
  const numericFields = ['minMarketCapEur', 'maxMarketCapEur', 'minPeRatio', 'maxPeRatio', 'minDividendYield', 'minPriceEur', 'maxPriceEur'] as const
  for (const field of numericFields) {
    if (body[field] !== undefined && body[field] !== null) {
      if (typeof body[field] !== 'number' || isNaN(body[field] as number)) {
        return NextResponse.json({ error: `${field} must be a number` }, { status: 400 })
      }
    }
  }

  // Build update data — only include fields that were sent
  const updateData: Record<string, unknown> = {}
  if (body.markets !== undefined) updateData.markets = body.markets
  if (body.minMarketCapEur !== undefined) updateData.minMarketCapEur = body.minMarketCapEur
  if (body.maxMarketCapEur !== undefined) updateData.maxMarketCapEur = body.maxMarketCapEur ?? null
  if (body.minPeRatio !== undefined) updateData.minPeRatio = body.minPeRatio ?? null
  if (body.maxPeRatio !== undefined) updateData.maxPeRatio = body.maxPeRatio ?? null
  if (body.minDividendYield !== undefined) updateData.minDividendYield = body.minDividendYield ?? null
  if (body.sectors !== undefined) updateData.sectors = body.sectors
  if (body.excludedSectors !== undefined) updateData.excludedSectors = body.excludedSectors
  if (body.riskLevels !== undefined) updateData.riskLevels = body.riskLevels
  if (body.minPriceEur !== undefined) updateData.minPriceEur = body.minPriceEur
  if (body.maxPriceEur !== undefined) updateData.maxPriceEur = body.maxPriceEur ?? null

  const config = await prisma.ideaConfig.upsert({
    where: { id: 'global' },
    update: updateData,
    create: {
      id: 'global',
      markets: (body.markets as string[]) ?? DEFAULT_IDEA_CONFIG.markets,
      minMarketCapEur: (body.minMarketCapEur as number) ?? DEFAULT_IDEA_CONFIG.minMarketCapEur,
      maxMarketCapEur: (body.maxMarketCapEur as number) ?? DEFAULT_IDEA_CONFIG.maxMarketCapEur,
      minPeRatio: (body.minPeRatio as number) ?? DEFAULT_IDEA_CONFIG.minPeRatio,
      maxPeRatio: (body.maxPeRatio as number) ?? DEFAULT_IDEA_CONFIG.maxPeRatio,
      minDividendYield: (body.minDividendYield as number) ?? DEFAULT_IDEA_CONFIG.minDividendYield,
      sectors: (body.sectors as string[]) ?? DEFAULT_IDEA_CONFIG.sectors,
      excludedSectors: (body.excludedSectors as string[]) ?? DEFAULT_IDEA_CONFIG.excludedSectors,
      riskLevels: (body.riskLevels as string[]) ?? DEFAULT_IDEA_CONFIG.riskLevels,
      minPriceEur: (body.minPriceEur as number) ?? DEFAULT_IDEA_CONFIG.minPriceEur,
      maxPriceEur: (body.maxPriceEur as number) ?? DEFAULT_IDEA_CONFIG.maxPriceEur,
    },
  })

  invalidateIdeaConfigCache()

  // Delete today's batch and ideas so they regenerate with new config
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todaysIdeas = await prisma.idea.findMany({
    where: { generatedDate: today },
    select: { id: true },
  })
  if (todaysIdeas.length > 0) {
    const ideaIds = todaysIdeas.map((i) => i.id)
    await prisma.priceHistory.deleteMany({ where: { ideaId: { in: ideaIds } } })
    await prisma.idea.deleteMany({ where: { id: { in: ideaIds } } })
  }
  try {
    await prisma.dailyIdeaBatch.delete({
      where: { generatedDate: today },
    })
  } catch {
    // No batch for today — that's fine
  }

  return NextResponse.json({
    ...config,
    markets: config.markets as string[],
    sectors: config.sectors as string[],
    excludedSectors: config.excludedSectors as string[],
    riskLevels: config.riskLevels as string[],
  })
}
