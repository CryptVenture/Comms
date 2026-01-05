/**
 * Provider Strategy Selector
 *
 * Factory function that maps channel configurations to their corresponding
 * provider strategies. Supports built-in strategies (fallback, roundrobin, no-fallback)
 * and custom strategy functions.
 *
 * @module strategies/providers
 *
 * @example
 * ```typescript
 * import strategyFactory from './index'
 * import type { ChannelConfig } from '../../types/config'
 *
 * const channels = {
 *   email: {
 *     providers: [
 *       { type: 'smtp', host: 'smtp.example.com' },
 *       { type: 'smtp', host: 'backup.example.com' }
 *     ],
 *     multiProviderStrategy: 'fallback'
 *   },
 *   sms: {
 *     providers: [
 *       { type: 'twilio', accountSid: '...', authToken: '...' }
 *     ],
 *     multiProviderStrategy: 'no-fallback'
 *   }
 * }
 *
 * const strategies = strategyFactory(channels)
 * // strategies.email will use fallback strategy
 * // strategies.sms will use no-fallback strategy
 * ```
 *
 * @example Custom strategy function
 * ```typescript
 * import type { StrategyFunction } from '../../types/strategies'
 *
 * const customStrategy: StrategyFunction = (providers) => {
 *   return async (request) => {
 *     // Custom logic here
 *     const id = await providers[0].send(request)
 *     return { id, providerId: providers[0].id }
 *   }
 * }
 *
 * const channels = {
 *   email: {
 *     providers: [...],
 *     multiProviderStrategy: customStrategy
 *   }
 * }
 *
 * const strategies = strategyFactory(channels)
 * ```
 */

import strategyFallback from './fallback'
import strategyNoFallback from './no-fallback'
import strategyRoundRobin from './roundrobin'
import strategyWeighted from './weighted'
import { ConfigurationError } from '../../types/errors'
import type { MultiProviderStrategyType } from '../../types'
import type { ChannelConfig } from '../../types/config'
import type { StrategyFunction } from '../../types/strategies'

/**
 * Map of built-in strategy names to their implementations
 */
const providerStrategies: Record<MultiProviderStrategyType, StrategyFunction> = {
  fallback: strategyFallback,
  'no-fallback': strategyNoFallback,
  roundrobin: strategyRoundRobin,
  // Type assertion required because WeightedStrategyFunction expects WeightedProvider
  // (with weight property). The strategy validates weights at runtime.
  weighted: strategyWeighted as unknown as StrategyFunction,
}

/**
 * List of valid built-in strategy names
 */
const strategies = Object.keys(providerStrategies) as MultiProviderStrategyType[]

/**
 * Strategy map type - maps channel names to strategy functions
 */
export type StrategyMap = Record<string, StrategyFunction>

/**
 * Validates that a strategy is either a function or a valid strategy name
 *
 * @param strategy - Strategy to validate
 * @param channelName - Channel name for error messages
 * @throws {ConfigurationError} if strategy is invalid
 *
 * @internal
 */
function validateStrategy(
  strategy: MultiProviderStrategyType | StrategyFunction | undefined,
  channelName: string
): void {
  if (!strategy) {
    throw new ConfigurationError(
      `Channel "${channelName}" is missing multiProviderStrategy. ` +
        `Strategy must be a function or one of: ${strategies.join(', ')}`
    )
  }

  if (
    typeof strategy !== 'function' &&
    !strategies.includes(strategy as MultiProviderStrategyType)
  ) {
    throw new ConfigurationError(
      `"${strategy}" is not a valid strategy for channel "${channelName}". ` +
        `Strategy must be a function or one of: ${strategies.join(', ')}`
    )
  }
}

/**
 * Resolves a strategy name or function to a StrategyFunction
 *
 * @param strategy - Strategy name or custom function
 * @returns The resolved strategy function
 *
 * @internal
 */
function resolveStrategy(strategy: MultiProviderStrategyType | StrategyFunction): StrategyFunction {
  // If it's already a function, return it
  if (typeof strategy === 'function') {
    return strategy
  }

  // Otherwise, look it up in the built-in strategies
  return providerStrategies[strategy]
}

/**
 * Strategy factory function
 *
 * Creates a map of channel names to strategy functions based on channel configurations.
 * Each channel must specify a multiProviderStrategy, which can be either:
 * - A built-in strategy name: 'fallback', 'roundrobin', or 'no-fallback'
 * - A custom strategy function implementing the StrategyFunction type
 *
 * @param channels - Channel configurations object
 * @returns Map of channel names to their strategy functions
 *
 * @throws {ConfigurationError} if a channel's strategy is invalid
 * @throws {ConfigurationError} if a channel is missing multiProviderStrategy
 *
 * @example
 * ```typescript
 * const channels = {
 *   email: {
 *     providers: [...],
 *     multiProviderStrategy: 'fallback'
 *   },
 *   sms: {
 *     providers: [...],
 *     multiProviderStrategy: (providers) => async (request) => {
 *       // Custom logic
 *       return { id: '123', providerId: providers[0].id }
 *     }
 *   }
 * }
 *
 * const strategies = factory(channels)
 * // strategies.email -> fallback strategy function
 * // strategies.sms -> custom strategy function
 * ```
 */
export default function factory(channels: Record<string, ChannelConfig>): StrategyMap {
  // Validate input
  if (!channels || typeof channels !== 'object') {
    throw new ConfigurationError('Channels configuration must be an object')
  }

  // Build strategy map from channel configurations
  return Object.keys(channels).reduce<StrategyMap>((acc, channelName) => {
    const channel = channels[channelName]
    const strategy = channel?.multiProviderStrategy

    // Validate the strategy
    validateStrategy(strategy, channelName)

    // Resolve and assign the strategy (strategy is guaranteed to be defined after validation)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    acc[channelName] = resolveStrategy(strategy!)

    return acc
  }, {})
}

/**
 * Export built-in strategies for direct use
 */
export { strategyFallback, strategyNoFallback, strategyRoundRobin, strategyWeighted }

/**
 * Export strategy names for validation
 */
export { strategies }
