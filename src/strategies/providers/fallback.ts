/**
 * Fallback Strategy
 *
 * Attempts to send notifications through providers sequentially until one succeeds.
 * If a provider fails, the strategy automatically tries the next provider in the list.
 * This is the recommended strategy for high availability scenarios.
 *
 * @module strategies/providers/fallback
 *
 * @example
 * ```typescript
 * import strategyFallback from './fallback'
 * import type { Provider } from '../../types'
 *
 * // Setup providers
 * const providers: Provider[] = [
 *   { id: 'primary-smtp', send: async (req) => 'msg-1' },
 *   { id: 'backup-smtp', send: async (req) => 'msg-2' },
 *   { id: 'tertiary-smtp', send: async (req) => 'msg-3' }
 * ]
 *
 * // Create strategy function
 * const sendWithFallback = strategyFallback(providers)
 *
 * // Send notification - will try primary, then backup if it fails, etc.
 * const result = await sendWithFallback({ to: 'user@example.com', subject: 'Hello' })
 * // result: { id: 'msg-1', providerId: 'primary-smtp' }
 * ```
 *
 * @example Custom provider types
 * ```typescript
 * interface EmailRequest {
 *   to: string
 *   subject: string
 *   body: string
 * }
 *
 * const emailProviders: Provider<EmailRequest>[] = [...]
 * const sendEmail = strategyFallback<EmailRequest>(emailProviders)
 *
 * const result = await sendEmail({
 *   to: 'user@example.com',
 *   subject: 'Welcome',
 *   body: 'Hello World'
 * })
 * ```
 */

import logger from '../../util/logger'
import { ConfigurationError, ProviderError } from '../../types/errors'
import type { Provider } from '../../types'
import type { ProviderSendResult } from '../../types/responses'
import type { StrategyFunction } from '../../types/strategies'

/**
 * Recursively tries providers until one succeeds
 *
 * @param providers - Array of providers to try in order
 * @param request - Request to send through providers
 * @returns Promise resolving to provider send result
 * @throws {ProviderError} If no providers are available
 * @throws Error from the last provider if all providers fail
 *
 * @internal
 */
async function recursiveTry<TRequest>(
  providers: Provider<TRequest>[],
  request: TRequest
): Promise<ProviderSendResult> {
  // Destructure to get current provider and remaining providers
  const [current, ...others] = providers

  // Validate that we have a provider
  if (!current) {
    throw new ProviderError(
      'No providers available',
      'fallback-strategy',
      undefined,
      'FALLBACK_NO_PROVIDERS'
    )
  }

  try {
    // Attempt to send through current provider
    const id = await current.send(request)
    return { providerId: current.id, id }
  } catch (error) {
    // Log the error for debugging
    logger.warn(current.id, error)

    // If no more providers, throw the error with provider context
    if (others.length === 0) {
      // Add provider context to error
      if (error instanceof Error) {
        ;(error as Error & { providerId?: string }).providerId = current.id
      }
      throw error
    }

    // Try next provider in the chain
    return recursiveTry(others, request)
  }
}

/**
 * Fallback strategy implementation
 *
 * Returns a function that attempts to send through providers sequentially.
 * Each provider is tried in order until one succeeds. If all providers fail,
 * the error from the last provider is thrown.
 *
 * @template TRequest - Type of the request object (defaults to unknown)
 * @param providers - Array of providers to use for sending
 * @returns Send function that implements fallback logic
 *
 * @throws {ConfigurationError} If providers array is empty
 * @throws Error from last provider if all providers fail
 */
const strategyFallback: StrategyFunction = <TRequest = unknown>(
  providers: Provider<TRequest>[]
) => {
  // Validate providers array
  if (!providers || providers.length === 0) {
    throw new ConfigurationError(
      'Fallback strategy requires at least one provider',
      'FALLBACK_REQUIRES_PROVIDER'
    )
  }

  // Return the send function
  return (request: TRequest) => recursiveTry(providers, request)
}

export default strategyFallback
