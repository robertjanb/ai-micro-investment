import type { IdeaProvider, PriceProvider, SignalProvider, RecommendationProvider } from './types'
import { MockIdeaProvider } from './mock/idea-provider'
import { MockPriceProvider } from './mock/price-provider'
import { MockSignalProvider } from './mock/signal-provider'
import { MockRecommendationProvider } from './mock/recommendation-provider'
import { YahooPriceProvider } from './real/price-provider'
import { RealIdeaProvider } from './real/idea-provider'
import { RealRecommendationProvider } from './real/recommendation-provider'

type DataSource = 'mock' | 'real'

function parseBooleanEnv(value: string | undefined): boolean | null {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return null
}

export function resolveDataSource(env: NodeJS.ProcessEnv = process.env): DataSource {
  const dataSource = env.DATA_SOURCE?.trim().toLowerCase()
  const useRealData = parseBooleanEnv(env.USE_REAL_DATA)

  if (dataSource === 'real' || dataSource === 'mock') {
    if (
      useRealData !== null &&
      ((dataSource === 'real' && useRealData === false) || (dataSource === 'mock' && useRealData === true))
    ) {
      console.warn(`DATA_SOURCE=${dataSource} overrides conflicting USE_REAL_DATA=${env.USE_REAL_DATA}`)
    }
    return dataSource
  }

  if (dataSource) {
    console.warn(`Invalid DATA_SOURCE=${env.DATA_SOURCE}. Falling back to USE_REAL_DATA/default.`)
  }

  if (useRealData !== null) {
    return useRealData ? 'real' : 'mock'
  }

  return 'mock'
}

// Export the Yahoo provider class for direct use when needed
export { YahooPriceProvider }

let ideaProviderInstance: IdeaProvider | null = null
let priceProviderInstance: PriceProvider | null = null
let signalProviderInstance: SignalProvider | null = null
let recommendationProviderInstance: RecommendationProvider | null = null
let providerDataSource: DataSource | null = null

function getCurrentDataSource(): DataSource {
  const current = resolveDataSource()
  if (providerDataSource !== current) {
    ideaProviderInstance = null
    priceProviderInstance = null
    signalProviderInstance = null
    recommendationProviderInstance = null
    providerDataSource = current
  }
  return current
}

export function getIdeaProvider(): IdeaProvider {
  const dataSource = getCurrentDataSource()
  if (!ideaProviderInstance) {
    if (dataSource === 'real') {
      ideaProviderInstance = new RealIdeaProvider()
    } else {
      ideaProviderInstance = new MockIdeaProvider()
    }
  }
  return ideaProviderInstance
}

export function getPriceProvider(): PriceProvider {
  const dataSource = getCurrentDataSource()
  if (!priceProviderInstance) {
    if (dataSource === 'real') {
      priceProviderInstance = new YahooPriceProvider()
    } else {
      priceProviderInstance = new MockPriceProvider()
    }
  }
  return priceProviderInstance
}

export function getSignalProvider(): SignalProvider {
  const dataSource = getCurrentDataSource()
  if (!signalProviderInstance) {
    if (dataSource === 'real') {
      throw new Error('Real data provider not yet implemented')
    }
    signalProviderInstance = new MockSignalProvider()
  }
  return signalProviderInstance
}

export function getRecommendationProvider(): RecommendationProvider {
  const dataSource = getCurrentDataSource()
  if (!recommendationProviderInstance) {
    if (dataSource === 'real') {
      recommendationProviderInstance = new RealRecommendationProvider()
    } else {
      recommendationProviderInstance = new MockRecommendationProvider()
    }
  }
  return recommendationProviderInstance
}
