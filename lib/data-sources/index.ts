import type { IdeaProvider, PriceProvider, SignalProvider, RecommendationProvider } from './types'
import { MockIdeaProvider } from './mock/idea-provider'
import { MockPriceProvider } from './mock/price-provider'
import { MockSignalProvider } from './mock/signal-provider'
import { MockRecommendationProvider } from './mock/recommendation-provider'
import { YahooPriceProvider } from './real/price-provider'
import { RealIdeaProvider } from './real/idea-provider'
import { RealRecommendationProvider } from './real/recommendation-provider'

const dataSource = process.env.DATA_SOURCE || 'mock'

// Export the Yahoo provider class for direct use when needed
export { YahooPriceProvider }

let ideaProviderInstance: IdeaProvider | null = null
let priceProviderInstance: PriceProvider | null = null
let signalProviderInstance: SignalProvider | null = null
let recommendationProviderInstance: RecommendationProvider | null = null

export function getIdeaProvider(): IdeaProvider {
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
  if (!signalProviderInstance) {
    if (dataSource === 'real') {
      throw new Error('Real data provider not yet implemented')
    }
    signalProviderInstance = new MockSignalProvider()
  }
  return signalProviderInstance
}

export function getRecommendationProvider(): RecommendationProvider {
  if (!recommendationProviderInstance) {
    if (dataSource === 'real') {
      recommendationProviderInstance = new RealRecommendationProvider()
    } else {
      recommendationProviderInstance = new MockRecommendationProvider()
    }
  }
  return recommendationProviderInstance
}
