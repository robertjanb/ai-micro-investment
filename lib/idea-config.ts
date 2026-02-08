import { prisma } from '@/lib/prisma'
import type { IdeaConfig } from '@prisma/client'

export interface IdeaConfigData {
  markets: string[]
  minMarketCapEur: number
  maxMarketCapEur: number | null
  minPeRatio: number | null
  maxPeRatio: number | null
  minDividendYield: number | null
  sectors: string[]
  excludedSectors: string[]
  riskLevels: string[]
  minPriceEur: number
  maxPriceEur: number | null
}

export const DEFAULT_IDEA_CONFIG: IdeaConfigData = {
  markets: ['US', 'DE', 'FR', 'NL', 'GB'],
  minMarketCapEur: 500_000_000,
  maxMarketCapEur: null,
  minPeRatio: null,
  maxPeRatio: null,
  minDividendYield: null,
  sectors: [],
  excludedSectors: [],
  riskLevels: [], // empty = all
  minPriceEur: 5,
  maxPriceEur: null,
}

// In-memory cache
let cachedConfig: IdeaConfig | null = null
let cacheTimestamp = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function getIdeaConfig(): Promise<IdeaConfigData> {
  if (cachedConfig && Date.now() - cacheTimestamp < CACHE_TTL) {
    return deserialize(cachedConfig)
  }

  const config = await prisma.ideaConfig.upsert({
    where: { id: 'global' },
    update: {},
    create: {
      id: 'global',
      markets: DEFAULT_IDEA_CONFIG.markets,
      minMarketCapEur: DEFAULT_IDEA_CONFIG.minMarketCapEur,
      maxMarketCapEur: DEFAULT_IDEA_CONFIG.maxMarketCapEur,
      minPeRatio: DEFAULT_IDEA_CONFIG.minPeRatio,
      maxPeRatio: DEFAULT_IDEA_CONFIG.maxPeRatio,
      minDividendYield: DEFAULT_IDEA_CONFIG.minDividendYield,
      sectors: DEFAULT_IDEA_CONFIG.sectors,
      excludedSectors: DEFAULT_IDEA_CONFIG.excludedSectors,
      riskLevels: DEFAULT_IDEA_CONFIG.riskLevels,
      minPriceEur: DEFAULT_IDEA_CONFIG.minPriceEur,
      maxPriceEur: DEFAULT_IDEA_CONFIG.maxPriceEur,
    },
  })

  cachedConfig = config
  cacheTimestamp = Date.now()
  return deserialize(config)
}

export function invalidateIdeaConfigCache() {
  cachedConfig = null
  cacheTimestamp = 0
}

function deserialize(config: IdeaConfig): IdeaConfigData {
  return {
    markets: config.markets as string[],
    minMarketCapEur: config.minMarketCapEur,
    maxMarketCapEur: config.maxMarketCapEur,
    minPeRatio: config.minPeRatio,
    maxPeRatio: config.maxPeRatio,
    minDividendYield: config.minDividendYield,
    sectors: config.sectors as string[],
    excludedSectors: config.excludedSectors as string[],
    riskLevels: config.riskLevels as string[],
    minPriceEur: config.minPriceEur,
    maxPriceEur: config.maxPriceEur,
  }
}

// Market code to Yahoo Finance suffix mapping
export const MARKET_SUFFIXES: Record<string, string> = {
  US: '',
  DE: '.DE',
  FR: '.PA',
  NL: '.AS',
  GB: '.L',
}
