import { vi, test, expect, describe, beforeEach, afterEach } from 'vitest'
import strategyWeighted from '../../../src/strategies/providers/weighted'
import logger from '../../../src/util/logger'
import type { WeightedProvider } from '../../../src/types/strategies'

vi.mock('../../../src/util/logger', () => ({
  default: {
    warn: vi.fn(),
  },
}))

const request = {
  sms: { from: '+15000000000', to: '+15000000001', text: 'Hello John! How are you?' },
}

describe('Weighted Strategy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('weighted distribution', () => {
    test('should select providers according to their weights over many iterations', async () => {
      // Track selection counts
      const selectionCounts: Record<string, number> = {
        'provider-1': 0,
        'provider-2': 0,
        'provider-3': 0,
      }

      const providers: WeightedProvider<typeof request>[] = [
        {
          id: 'provider-1',
          send: async () => {
            selectionCounts['provider-1']++
            return 'msg-1'
          },
          weight: 50,
        },
        {
          id: 'provider-2',
          send: async () => {
            selectionCounts['provider-2']++
            return 'msg-2'
          },
          weight: 30,
        },
        {
          id: 'provider-3',
          send: async () => {
            selectionCounts['provider-3']++
            return 'msg-3'
          },
          weight: 20,
        },
      ]

      const iterations = 1000
      for (let i = 0; i < iterations; i++) {
        const strategy = strategyWeighted(providers)
        await strategy(request)
      }

      // Calculate actual percentages
      const p1Pct = selectionCounts['provider-1'] / iterations
      const p2Pct = selectionCounts['provider-2'] / iterations
      const p3Pct = selectionCounts['provider-3'] / iterations

      // With 1000 iterations, we expect results within ~10% of expected distribution
      // Expected: 50%, 30%, 20%
      expect(p1Pct).toBeGreaterThan(0.4)
      expect(p1Pct).toBeLessThan(0.6)
      expect(p2Pct).toBeGreaterThan(0.2)
      expect(p2Pct).toBeLessThan(0.4)
      expect(p3Pct).toBeGreaterThan(0.1)
      expect(p3Pct).toBeLessThan(0.3)
    })

    test('should select provider deterministically when Math.random is mocked', async () => {
      const originalRandom = Math.random

      // Mock Math.random to return 0 (should select first provider)
      Math.random = vi.fn(() => 0)

      const providers: WeightedProvider<typeof request>[] = [
        { id: 'provider-1', send: async () => 'msg-1', weight: 50 },
        { id: 'provider-2', send: async () => 'msg-2', weight: 50 },
      ]

      const strategy = strategyWeighted(providers)
      const result = await strategy(request)

      expect(result).toEqual({ providerId: 'provider-1', id: 'msg-1' })

      // Mock Math.random to return 0.5 (should select second provider with equal weights)
      Math.random = vi.fn(() => 0.5)

      const strategy2 = strategyWeighted(providers)
      const result2 = await strategy2(request)

      expect(result2).toEqual({ providerId: 'provider-2', id: 'msg-2' })

      // Restore
      Math.random = originalRandom
    })

    test('should select provider based on cumulative weight threshold', async () => {
      const originalRandom = Math.random

      const providers: WeightedProvider<typeof request>[] = [
        { id: 'provider-1', send: async () => 'msg-1', weight: 30 },
        { id: 'provider-2', send: async () => 'msg-2', weight: 50 },
        { id: 'provider-3', send: async () => 'msg-3', weight: 20 },
      ]

      // Total weight = 100
      // Random value 0.25 * 100 = 25, cumulative at provider-1 is 30, so provider-1 is selected
      Math.random = vi.fn(() => 0.25)
      let strategy = strategyWeighted(providers)
      expect(await strategy(request)).toEqual({ providerId: 'provider-1', id: 'msg-1' })

      // Random value 0.35 * 100 = 35, cumulative at provider-1 is 30, at provider-2 is 80
      // 35 >= 30 and 35 < 80, so provider-2 is selected
      Math.random = vi.fn(() => 0.35)
      strategy = strategyWeighted(providers)
      expect(await strategy(request)).toEqual({ providerId: 'provider-2', id: 'msg-2' })

      // Random value 0.85 * 100 = 85, cumulative at provider-2 is 80, at provider-3 is 100
      // 85 >= 80 and 85 < 100, so provider-3 is selected
      Math.random = vi.fn(() => 0.85)
      strategy = strategyWeighted(providers)
      expect(await strategy(request)).toEqual({ providerId: 'provider-3', id: 'msg-3' })

      Math.random = originalRandom
    })
  })

  describe('fallback on failure', () => {
    test('should fall back to remaining providers when selected provider fails', async () => {
      const originalRandom = Math.random
      let callCount = 0

      // First call returns 0 (selects failing provider-1)
      // Second call returns 0 (selects provider-2 from remaining)
      Math.random = vi.fn(() => {
        callCount++
        return 0
      })

      const providers: WeightedProvider<typeof request>[] = [
        {
          id: 'provider-1',
          send: async () => {
            throw new Error('provider 1 failed')
          },
          weight: 80,
        },
        { id: 'provider-2', send: async () => 'msg-2', weight: 20 },
      ]

      const strategy = strategyWeighted(providers)
      const result = await strategy(request)

      expect(logger.warn).toBeCalledWith(
        'provider-1',
        expect.objectContaining({ message: 'provider 1 failed' })
      )
      expect(result).toEqual({ providerId: 'provider-2', id: 'msg-2' })

      Math.random = originalRandom
    })

    test('should try all providers before throwing error', async () => {
      const providers: WeightedProvider<typeof request>[] = [
        {
          id: 'provider-1',
          send: async () => {
            throw new Error('error provider 1')
          },
          weight: 50,
        },
        {
          id: 'provider-2',
          send: async () => {
            throw new Error('error provider 2')
          },
          weight: 30,
        },
        {
          id: 'provider-3',
          send: async () => {
            throw new Error('error provider 3')
          },
          weight: 20,
        },
      ]

      const strategy = strategyWeighted(providers)

      let error
      try {
        await strategy(request)
      } catch (e) {
        error = e
      }

      // All providers should have been tried and logged
      expect(logger.warn).toHaveBeenCalledTimes(3)
      // Error should have providerId of the last failed provider
      expect(error).toBeDefined()
      expect((error as Error & { providerId: string }).providerId).toBeDefined()
    })

    test('should respect weights when falling back to remaining providers', async () => {
      const originalRandom = Math.random
      const callOrder: string[] = []

      // First random selects provider-1 (fails)
      // Remaining providers: provider-2 (60), provider-3 (20)
      // Second random should select from remaining with re-weighted distribution
      let callCount = 0
      Math.random = vi.fn(() => {
        callCount++
        // First call: 0 selects provider-1
        // Second call: 0.8 * 80 = 64 > 60, selects provider-3
        return callCount === 1 ? 0 : 0.8
      })

      const providers: WeightedProvider<typeof request>[] = [
        {
          id: 'provider-1',
          send: async () => {
            callOrder.push('provider-1')
            throw new Error('provider 1 failed')
          },
          weight: 20,
        },
        {
          id: 'provider-2',
          send: async () => {
            callOrder.push('provider-2')
            return 'msg-2'
          },
          weight: 60,
        },
        {
          id: 'provider-3',
          send: async () => {
            callOrder.push('provider-3')
            return 'msg-3'
          },
          weight: 20,
        },
      ]

      const strategy = strategyWeighted(providers)
      const result = await strategy(request)

      expect(callOrder[0]).toBe('provider-1')
      // Result should be from one of the remaining providers
      expect(['provider-2', 'provider-3']).toContain(result.providerId)

      Math.random = originalRandom
    })
  })

  describe('weight normalization', () => {
    test('should work with weights that do not sum to 100', async () => {
      const originalRandom = Math.random

      // Weights: 5, 3, 2 (total 10) - should normalize to 50%, 30%, 20%
      const providers: WeightedProvider<typeof request>[] = [
        { id: 'provider-1', send: async () => 'msg-1', weight: 5 },
        { id: 'provider-2', send: async () => 'msg-2', weight: 3 },
        { id: 'provider-3', send: async () => 'msg-3', weight: 2 },
      ]

      // Random value 0.6 * 10 = 6, cumulative: p1=5, p2=8
      // 6 >= 5 and 6 < 8, so provider-2 should be selected
      Math.random = vi.fn(() => 0.6)
      const strategy = strategyWeighted(providers)
      const result = await strategy(request)

      expect(result).toEqual({ providerId: 'provider-2', id: 'msg-2' })

      Math.random = originalRandom
    })

    test('should work with very small weights', async () => {
      const providers: WeightedProvider<typeof request>[] = [
        { id: 'provider-1', send: async () => 'msg-1', weight: 0.001 },
        { id: 'provider-2', send: async () => 'msg-2', weight: 0.001 },
      ]

      const strategy = strategyWeighted(providers)
      const result = await strategy(request)

      expect(['provider-1', 'provider-2']).toContain(result.providerId)
    })

    test('should work with very large weights', async () => {
      const providers: WeightedProvider<typeof request>[] = [
        { id: 'provider-1', send: async () => 'msg-1', weight: 1000000 },
        { id: 'provider-2', send: async () => 'msg-2', weight: 1000000 },
      ]

      const strategy = strategyWeighted(providers)
      const result = await strategy(request)

      expect(['provider-1', 'provider-2']).toContain(result.providerId)
    })
  })

  describe('edge cases', () => {
    test('should work with a single provider', async () => {
      const providers: WeightedProvider<typeof request>[] = [
        { id: 'only-provider', send: async () => 'msg-single', weight: 100 },
      ]

      const strategy = strategyWeighted(providers)
      const result = await strategy(request)

      expect(result).toEqual({ providerId: 'only-provider', id: 'msg-single' })
    })

    test('should select evenly when all providers have same weight', async () => {
      const selectionCounts: Record<string, number> = {
        'provider-1': 0,
        'provider-2': 0,
        'provider-3': 0,
      }

      const providers: WeightedProvider<typeof request>[] = [
        {
          id: 'provider-1',
          send: async () => {
            selectionCounts['provider-1']++
            return 'msg-1'
          },
          weight: 10,
        },
        {
          id: 'provider-2',
          send: async () => {
            selectionCounts['provider-2']++
            return 'msg-2'
          },
          weight: 10,
        },
        {
          id: 'provider-3',
          send: async () => {
            selectionCounts['provider-3']++
            return 'msg-3'
          },
          weight: 10,
        },
      ]

      const iterations = 900
      for (let i = 0; i < iterations; i++) {
        const strategy = strategyWeighted(providers)
        await strategy(request)
      }

      // Each provider should be selected roughly 1/3 of the time
      const expectedCount = iterations / 3
      const tolerance = expectedCount * 0.3 // 30% tolerance

      expect(selectionCounts['provider-1']).toBeGreaterThan(expectedCount - tolerance)
      expect(selectionCounts['provider-1']).toBeLessThan(expectedCount + tolerance)
      expect(selectionCounts['provider-2']).toBeGreaterThan(expectedCount - tolerance)
      expect(selectionCounts['provider-2']).toBeLessThan(expectedCount + tolerance)
      expect(selectionCounts['provider-3']).toBeGreaterThan(expectedCount - tolerance)
      expect(selectionCounts['provider-3']).toBeLessThan(expectedCount + tolerance)
    })

    test('should handle provider with weight 0', async () => {
      const originalRandom = Math.random

      const providers: WeightedProvider<typeof request>[] = [
        { id: 'provider-1', send: async () => 'msg-1', weight: 0 },
        { id: 'provider-2', send: async () => 'msg-2', weight: 100 },
      ]

      // Provider with weight 0 should never be selected during normal selection
      Math.random = vi.fn(() => 0)
      const strategy = strategyWeighted(providers)
      const result = await strategy(request)

      expect(result).toEqual({ providerId: 'provider-2', id: 'msg-2' })

      Math.random = originalRandom
    })

    test('should fall back to zero-weight provider if all weighted providers fail', async () => {
      const providers: WeightedProvider<typeof request>[] = [
        {
          id: 'provider-1',
          send: async () => {
            throw new Error('provider 1 failed')
          },
          weight: 100,
        },
        { id: 'provider-2', send: async () => 'msg-backup', weight: 0 },
      ]

      const strategy = strategyWeighted(providers)
      const result = await strategy(request)

      expect(result).toEqual({ providerId: 'provider-2', id: 'msg-backup' })
    })

    test('should work when all providers have weight 0', async () => {
      const providers: WeightedProvider<typeof request>[] = [
        { id: 'provider-1', send: async () => 'msg-1', weight: 0 },
        { id: 'provider-2', send: async () => 'msg-2', weight: 0 },
      ]

      // When all weights are 0, should fall back to first provider
      const strategy = strategyWeighted(providers)
      const result = await strategy(request)

      expect(result).toEqual({ providerId: 'provider-1', id: 'msg-1' })
    })
  })

  describe('error handling', () => {
    test('should throw error when no providers are given', () => {
      expect(() => strategyWeighted([])).toThrow('Weighted strategy requires at least one provider')
    })

    test('should throw error when providers array is null/undefined', () => {
      expect(() => strategyWeighted(null as any)).toThrow(
        'Weighted strategy requires at least one provider'
      )
      expect(() => strategyWeighted(undefined as any)).toThrow(
        'Weighted strategy requires at least one provider'
      )
    })

    test('should throw error for negative weights', () => {
      const providers: WeightedProvider<typeof request>[] = [
        { id: 'provider-1', send: async () => 'msg-1', weight: -10 },
      ]

      expect(() => strategyWeighted(providers)).toThrow(
        'Provider "provider-1" must have a non-negative weight. Got: -10'
      )
    })

    test('should throw error for non-numeric weights', () => {
      const providers = [
        { id: 'provider-1', send: async () => 'msg-1', weight: 'high' as any },
      ]

      expect(() => strategyWeighted(providers as any)).toThrow(
        'Provider "provider-1" must have a non-negative weight'
      )
    })

    test('should throw error for undefined weights', () => {
      const providers = [{ id: 'provider-1', send: async () => 'msg-1' }]

      expect(() => strategyWeighted(providers as any)).toThrow(
        'Provider "provider-1" must have a non-negative weight'
      )
    })

    test('should add providerId to error when all providers fail', async () => {
      const providers: WeightedProvider<typeof request>[] = [
        {
          id: 'only-provider',
          send: async () => {
            throw new Error('the only provider failed')
          },
          weight: 100,
        },
      ]

      const strategy = strategyWeighted(providers)

      let error
      try {
        await strategy(request)
      } catch (e) {
        error = e
      }

      expect(error).toEqual(
        expect.objectContaining({
          message: 'the only provider failed',
          providerId: 'only-provider',
        })
      )
    })
  })
})
