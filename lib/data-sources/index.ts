import type { IdeaProvider, PriceProvider, SignalProvider } from './types'
import { MockIdeaProvider } from './mock/idea-provider'
import { MockPriceProvider } from './mock/price-provider'
import { MockSignalProvider } from './mock/signal-provider'

const dataSource = process.env.DATA_SOURCE || 'mock'

let ideaProviderInstance: IdeaProvider | null = null
let priceProviderInstance: PriceProvider | null = null
let signalProviderInstance: SignalProvider | null = null

export function getIdeaProvider(): IdeaProvider {
  if (!ideaProviderInstance) {
    if (dataSource === 'real') {
      throw new Error('Real data provider not yet implemented')
    }
    ideaProviderInstance = new MockIdeaProvider()
  }
  return ideaProviderInstance
}

export function getPriceProvider(): PriceProvider {
  if (!priceProviderInstance) {
    if (dataSource === 'real') {
      throw new Error('Real data provider not yet implemented')
    }
    priceProviderInstance = new MockPriceProvider()
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
