import { test, expect } from 'vitest'
import strategyProvidersFactory from '../../../src/strategies/providers'
import strategyFallback from '../../../src/strategies/providers/fallback'
import strategyNoFallback from '../../../src/strategies/providers/no-fallback'
import strategyRoundrobin from '../../../src/strategies/providers/roundrobin'

test('Strategy provider factory should replace provider key with its corresponding function.', () => {
  const customStrategy = () => {}
  expect(
    strategyProvidersFactory({
      email: {
        providers: [],
        multiProviderStrategy: 'no-fallback',
      },
      sms: {
        providers: [],
        multiProviderStrategy: 'fallback',
      },
      voice: {
        providers: [],
        multiProviderStrategy: 'fallback',
      },
      push: {
        providers: [],
        multiProviderStrategy: 'roundrobin',
      },
      webpush: {
        providers: [],
        multiProviderStrategy: customStrategy as any,
      },
    } as any)
  ).toEqual({
    email: strategyNoFallback,
    sms: strategyFallback,
    voice: strategyFallback,
    push: strategyRoundrobin,
    webpush: customStrategy,
  })
})

test('Strategy provider factory should throw an error if the strategy does not exist.', () => {
  expect(() => {
    strategyProvidersFactory({
      email: {
        providers: [],
        multiProviderStrategy: 'unknown-strategy' as any,
      },
    } as any)
  }).toThrow(
    '"unknown-strategy" is not a valid strategy for channel "email". Strategy must be a function or one of: fallback, no-fallback, roundrobin'
  )
})
