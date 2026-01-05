/**
 * Weighted Strategy
 *
 * Selects providers based on configured weight distribution, providing
 * probabilistic load balancing. Providers with higher weights are more
 * likely to be selected. If the selected provider fails, the strategy
 * falls back to remaining providers, respecting their relative weights.
 *
 * This strategy is ideal for scenarios where you want to distribute
 * traffic according to specific ratios (e.g., 70% to primary, 30% to backup)
 * while maintaining fallback capabilities.
 *
 * @module strategies/providers/weighted
 *
 * @example
 * ```typescript
 * import strategyWeighted from './weighted'
 * import type { WeightedProvider } from '../../types/strategies'
 *
 * // Setup providers with percentage weights (70/30 split)
 * const providers: WeightedProvider[] = [
 *   { id: 'sendgrid', send: async (req) => 'msg-1', weight: 70 },
 *   { id: 'ses', send: async (req) => 'msg-2', weight: 30 }
 * ]
 *
 * // Create strategy function
 * const sendWithWeighted = strategyWeighted(providers)
 *
 * // Send notification - 70% chance of using sendgrid, 30% chance of using ses
 * const result = await sendWithWeighted({ to: 'user@example.com', subject: 'Hello' })
 * // result: { id: 'msg-1', providerId: 'sendgrid' } or { id: 'msg-2', providerId: 'ses' }
 * ```
 *
 * @example Using priority scores
 * ```typescript
 * // Weights can be any positive number - they're normalized automatically
 * const providers: WeightedProvider[] = [
 *   { id: 'primary', send: async (req) => 'msg-1', weight: 5 },
 *   { id: 'secondary', send: async (req) => 'msg-2', weight: 3 },
 *   { id: 'tertiary', send: async (req) => 'msg-3', weight: 2 }
 * ]
 *
 * // 50% primary, 30% secondary, 20% tertiary
 * const sendEmail = strategyWeighted(providers)
 * ```
 *
 * @example Fallback behavior
 * ```typescript
 * // If primary fails, remaining providers are used with re-weighted distribution
 * const providers: WeightedProvider[] = [
 *   { id: 'unreliable', send: async (req) => { throw new Error('Down') }, weight: 80 },
 *   { id: 'reliable', send: async (req) => 'msg-backup', weight: 20 }
 * ]
 *
 * const sendEmail = strategyWeighted(providers)
 *
 * // Even if 'unreliable' is selected first (80% chance),
 * // 'reliable' will be used as fallback
 * const result = await sendEmail({ to: 'user@example.com' })
 * // result: { id: 'msg-backup', providerId: 'reliable' }
 * ```
 *
 * @remarks
 * The weighted selection uses a cumulative weight algorithm for O(n) selection.
 * Weights are normalized during selection, so they can be expressed as
 * percentages, priority scores, or any positive number. Providers with
 * weight 0 will never be selected during normal weighted selection but
 * may still be used as a last-resort fallback if all weighted providers fail.
 */

import logger from '../../util/logger'
import { ConfigurationError, ProviderError } from '../../types/errors'
import type { ProviderSendResult } from '../../types/responses'
import type { WeightedProvider, WeightedStrategyFunction } from '../../types/strategies'

/**
 * Selects a provider using weighted random selection
 *
 * Uses the cumulative weight algorithm:
 * 1. Calculate total weight of all providers
 * 2. Generate random number between 0 and total weight
 * 3. Iterate through providers, accumulating weights until random value is exceeded
 *
 * @param providers - Array of weighted providers to select from
 * @returns The selected provider, or undefined if no valid provider exists
 *
 * @internal
 */
function selectWeightedProvider<TRequest>(
  providers: WeightedProvider<TRequest>[]
): WeightedProvider<TRequest> | undefined {
  // Filter to providers with positive weight
  const validProviders = providers.filter((p) => p.weight > 0)

  // If no valid providers, return the first provider as fallback
  if (validProviders.length === 0) {
    return providers[0]
  }

  // Calculate total weight
  const totalWeight = validProviders.reduce((sum, provider) => sum + provider.weight, 0)

  // Generate random value between 0 and totalWeight
  const randomValue = Math.random() * totalWeight

  // Select provider using cumulative weight
  let cumulativeWeight = 0
  for (const provider of validProviders) {
    cumulativeWeight += provider.weight
    if (randomValue < cumulativeWeight) {
      return provider
    }
  }

  // Fallback to last provider (shouldn't happen, but TypeScript safety)
  return validProviders[validProviders.length - 1]
}

/**
 * Recursively tries weighted-selected providers until one succeeds
 *
 * @param providers - Array of weighted providers to try
 * @param request - Request to send through providers
 * @returns Promise resolving to provider send result
 * @throws {ProviderError} If no providers are available
 * @throws Error from the last provider if all providers fail
 *
 * @internal
 */
async function recursiveWeightedTry<TRequest>(
  providers: WeightedProvider<TRequest>[],
  request: TRequest
): Promise<ProviderSendResult> {
  // Validate that we have providers
  if (providers.length === 0) {
    throw new ProviderError(
      'No providers available',
      'weighted-strategy',
      undefined,
      'WEIGHTED_NO_PROVIDERS'
    )
  }

  // Select a provider based on weights
  const selected = selectWeightedProvider(providers)

  // Validate selection
  if (!selected) {
    throw new ProviderError(
      'No providers available',
      'weighted-strategy',
      undefined,
      'WEIGHTED_NO_PROVIDERS'
    )
  }

  try {
    // Attempt to send through selected provider
    const id = await selected.send(request)
    return { providerId: selected.id, id }
  } catch (error) {
    // Log the error for debugging
    logger.warn(selected.id, error)

    // Get remaining providers (exclude the failed one)
    const remaining = providers.filter((p) => p.id !== selected.id)

    // If no more providers, throw the error with provider context
    if (remaining.length === 0) {
      // Add provider context to error
      if (error instanceof Error) {
        ;(error as Error & { providerId?: string }).providerId = selected.id
      }
      throw error
    }

    // Try remaining providers with weighted selection
    return recursiveWeightedTry(remaining, request)
  }
}

/**
 * Weighted strategy implementation
 *
 * Returns a function that selects providers based on their configured weights.
 * On each send, a provider is randomly selected with probability proportional
 * to its weight. If the selected provider fails, the strategy falls back to
 * remaining providers, still respecting their relative weights.
 *
 * @template TRequest - Type of the request object (defaults to unknown)
 * @param providers - Array of weighted providers to use for sending
 * @returns Send function that implements weighted selection with fallback
 *
 * @throws {ConfigurationError} If providers array is empty
 * @throws {ConfigurationError} If any provider has an invalid weight
 * @throws Error from last provider if all providers fail
 */
const strategyWeighted: WeightedStrategyFunction = <TRequest = unknown>(
  providers: WeightedProvider<TRequest>[]
) => {
  // Validate providers array
  if (!providers || providers.length === 0) {
    throw new ConfigurationError(
      'Weighted strategy requires at least one provider',
      'WEIGHTED_REQUIRES_PROVIDER'
    )
  }

  // Validate that all providers have weight property
  for (const provider of providers) {
    if (typeof provider.weight !== 'number' || provider.weight < 0) {
      throw new ConfigurationError(
        `Provider "${provider.id}" must have a non-negative weight. Got: ${provider.weight}`,
        'WEIGHTED_INVALID_WEIGHT'
      )
    }
  }

  // Return the send function
  return (request: TRequest) => recursiveWeightedTry(providers, request)
}

export default strategyWeighted
