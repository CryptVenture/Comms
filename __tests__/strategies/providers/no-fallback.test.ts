import { vi, test, expect } from 'vitest'
import strategyNoFallback from '../../../src/strategies/providers/no-fallback'
import logger from '../../../src/util/logger'
import { ConfigurationError } from '../../../src/types/errors'

vi.mock('../../../src/util/logger', () => ({
  default: {
    warn: vi.fn(),
  },
}))

test('No-Fallback strategy should call first provider and return success if it succeeded.', async () => {
  const strategy = strategyNoFallback([
    {
      id: 'sms-provider-1',
      send: async () => '24',
    },
  ] as any)
  const result = await strategy({
    sms: { from: '+15000000000', to: '+15000000001', text: 'Hello John! How are you?' },
  })

  expect(result).toEqual({ providerId: 'sms-provider-1', id: '24' })
})

test('No-Fallback strategy should call first provider and throw error if it failed.', async () => {
  const strategy = strategyNoFallback([
    {
      id: 'sms-provider-1',
      send: async () => {
        throw new Error('error provider 1')
      },
    },
  ] as any)

  let error
  try {
    await strategy({
      sms: { from: '+15000000000', to: '+15000000001', text: 'Hello John! How are you?' },
    })
  } catch (e) {
    error = e
  }
  const expectedError = new Error('error provider 1')
  ;(expectedError as Error & { providerId?: string }).providerId = 'sms-provider-1'
  expect(logger.warn).toBeCalledWith('sms-provider-1', expectedError)
  expect(error).toEqual(expectedError)
})

test('No-Fallback strategy should throw ConfigurationError when no providers are given.', () => {
  expect(() => strategyNoFallback([])).toThrow(ConfigurationError)
  expect(() => strategyNoFallback([])).toThrow('No-fallback strategy requires exactly one provider')
})

test('No-Fallback strategy should throw ConfigurationError when providers array is null/undefined.', () => {
  expect(() => strategyNoFallback(null as any)).toThrow(ConfigurationError)
  expect(() => strategyNoFallback(undefined as any)).toThrow(ConfigurationError)
})

test('No-Fallback strategy should throw ConfigurationError when more than one provider is given.', () => {
  const providers = [
    { id: 'sms-provider-1', send: async () => '24' },
    { id: 'sms-provider-2', send: async () => '25' },
  ]
  expect(() => strategyNoFallback(providers as any)).toThrow(ConfigurationError)
  expect(() => strategyNoFallback(providers as any)).toThrow(
    'No-fallback strategy requires exactly one provider, but 2 were provided'
  )
})
