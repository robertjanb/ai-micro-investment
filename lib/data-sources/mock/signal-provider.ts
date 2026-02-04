import type { SignalProvider, Signals } from '../types'

export class MockSignalProvider implements SignalProvider {
  async getSignals(_ticker: string): Promise<Signals> {
    return {
      hiring: Math.random() > 0.4,
      earnings: Math.random() > 0.5,
      regulatory: Math.random() > 0.6,
      supplyChain: Math.random() > 0.5,
    }
  }
}
