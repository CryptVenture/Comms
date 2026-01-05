import { vi, test, expect } from 'vitest'
import strategyFallback from '../../../src/strategies/providers/fallback'
import logger from '../../../src/util/logger'
import { ConfigurationError } from '../../../src/types/errors'

vi.mock('../../../src/util/logger', () => ({
  default: {
    warn: vi.fn(),
  },
}))

const failingProviders = [
  {
    id: 'sms-provider-1',
    send: async () => {
      throw new Error('error provider 1')
    },
  },
  {
    id: 'sms-provider-2',
    send: async () => {
      throw new Error('error provider 2')
    },
  },
]

test('Fallback strategy should call all providers and return success if one succeeded.', async () => {
  const strategy = strategyFallback([
    ...failingProviders,
    {
      id: 'sms-provider-3',
      send: async () => '24',
    },
  ] as any)
  const result = await strategy({
    sms: { from: '+15000000000', to: '+15000000001', text: 'Hello John! How are you?' },
  })

  expect(logger.warn).toBeCalledWith(
    'sms-provider-1',
    expect.objectContaining({ message: 'error provider 1' })
  )
  expect(logger.warn).toBeCalledWith(
    'sms-provider-2',
    expect.objectContaining({ message: 'error provider 2' })
  )
  expect(result).toEqual({ providerId: 'sms-provider-3', id: '24' })
})

test('Fallback strategy should call all providers and throw error if all failed.', async () => {
  const strategy = strategyFallback(failingProviders as any)

  let error
  try {
    await strategy({
      sms: { from: '+15000000000', to: '+15000000001', text: 'Hello John! How are you?' },
    })
  } catch (e) {
    error = e
  }
  expect(logger.warn).toBeCalledWith(
    'sms-provider-1',
    expect.objectContaining({ message: 'error provider 1' })
  )
  expect(logger.warn).toBeCalledWith(
    'sms-provider-2',
    expect.objectContaining({ message: 'error provider 2' })
  )
  expect(error).toEqual(
    expect.objectContaining({ message: 'error provider 2', providerId: 'sms-provider-2' })
  )
})

test('Fallback strategy should throw ConfigurationError when no providers are given.', () => {
  expect(() => strategyFallback([])).toThrow(ConfigurationError)
  expect(() => strategyFallback([])).toThrow('Fallback strategy requires at least one provider')
})

test('Fallback strategy should throw ConfigurationError when providers array is null/undefined.', () => {
  expect(() => strategyFallback(null as any)).toThrow(ConfigurationError)
  expect(() => strategyFallback(undefined as any)).toThrow(ConfigurationError)
})
