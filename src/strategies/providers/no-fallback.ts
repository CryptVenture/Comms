/**
 * No-Fallback Strategy
 *
 * Sends notifications through a single provider without any fallback mechanism.
 * If the provider fails, the error is immediately thrown. This strategy is suitable
 * for scenarios where you have a single, highly reliable provider or when you want
 * explicit control over error handling.
 *
 * @module strategies/providers/no-fallback
 *
 * @example
 * ```typescript
 * import strategyNoFallback from './no-fallback'
 * import type { Provider } from '../../types'
 *
 * // Setup single provider
 * const providers: Provider[] = [
 *   { id: 'primary-smtp', send: async (req) => 'msg-1' }
 * ]
 *
 * // Create strategy function
 * const sendEmail = strategyNoFallback(providers)
 *
 * try {
 *   // Send notification - will throw if provider fails
 *   const result = await sendEmail({ to: 'user@example.com', subject: 'Hello' })
 *   console.log(result) // { id: 'msg-1', providerId: 'primary-smtp' }
 * } catch (error) {
 *   // Handle error explicitly
 *   console.error('Failed to send:', error)
 * }
 * ```
 *
 * @example Custom provider types
 * ```typescript
 * interface SMSRequest {
 *   to: string
 *   message: string
 * }
 *
 * const smsProviders: Provider<SMSRequest>[] = [
 *   { id: 'twilio', send: async (req) => 'sms-123' }
 * ]
 *
 * const sendSMS = strategyNoFallback<SMSRequest>(smsProviders)
 *
 * const result = await sendSMS({
 *   to: '+1234567890',
 *   message: 'Your verification code is 123456'
 * })
 * ```
 */

import logger from '../../util/logger'
import type { Provider } from '../../types'
import type { ProviderSendResult } from '../../types/responses'
import type { StrategyFunction } from '../../types/strategies'

/**
 * No-fallback strategy implementation
 *
 * Returns a function that sends through a single provider without fallback.
 * This strategy expects exactly one provider in the providers array.
 * Any errors from the provider are logged and re-thrown with provider context.
 *
 * @template TRequest - Type of the request object (defaults to unknown)
 * @param providers - Array containing exactly one provider
 * @returns Send function that implements no-fallback logic
 *
 * @throws Error if providers array is empty or contains more than one provider
 * @throws Error from provider if send fails
 */
const strategyNoFallback: StrategyFunction = <TRequest = unknown>(
  providers: Provider<TRequest>[]
) => {
  // Validate that we have exactly one provider
  if (!providers || providers.length === 0) {
    throw new Error('No-fallback strategy requires exactly one provider')
  }

  if (providers.length > 1) {
    throw new Error(
      `No-fallback strategy requires exactly one provider, but ${providers.length} were provided. ` +
        'Use "fallback" or "roundrobin" strategy for multiple providers.'
    )
  }

  // Extract the single provider
  const [provider] = providers

  // Ensure provider exists (should always be true after validation, but TypeScript doesn't know that)
  if (!provider) {
    throw new Error('No provider available after validation')
  }

  // Return the send function
  return async (request: TRequest): Promise<ProviderSendResult> => {
    try {
      // Attempt to send through the provider
      const id = await provider.send(request)
      return { providerId: provider.id, id }
    } catch (error) {
      // Log the error for debugging
      logger.warn(provider.id, error)

      // Add provider context to error
      if (error instanceof Error) {
        ;(error as Error & { providerId?: string }).providerId = provider.id
      }

      // Re-throw the error
      throw error
    }
  }
}

export default strategyNoFallback
