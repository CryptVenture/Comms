/**
 * Strategy types for multi-provider handling
 */

import type { Provider } from './index'
import type { ProviderSendResult } from './responses'

/**
 * Strategy function type
 * Takes an array of providers and returns a send function
 */
export type StrategyFunction<TRequest = unknown> = (
  providers: Provider<TRequest>[]
) => (request: TRequest) => Promise<ProviderSendResult>

/**
 * Strategy selector function
 */
export type StrategySelector = (strategyName: string | StrategyFunction) => StrategyFunction

/**
 * Weighted provider interface
 *
 * Extends the base Provider with a weight property for use with the weighted
 * multi-provider strategy. The weight determines the probability of a provider
 * being selected relative to other providers.
 *
 * @template TRequest - Type of the request object (defaults to unknown)
 *
 * @example
 * ```typescript
 * // Using percentage weights (should sum to 100)
 * const providers: WeightedProvider<EmailRequest>[] = [
 *   { id: 'sendgrid', send: async (req) => 'msg-1', weight: 70 },
 *   { id: 'ses', send: async (req) => 'msg-2', weight: 30 }
 * ]
 *
 * // Using arbitrary priority scores (normalized automatically)
 * const providers: WeightedProvider<EmailRequest>[] = [
 *   { id: 'primary', send: async (req) => 'msg-1', weight: 5 },
 *   { id: 'secondary', send: async (req) => 'msg-2', weight: 3 },
 *   { id: 'tertiary', send: async (req) => 'msg-3', weight: 2 }
 * ]
 * ```
 *
 * @remarks
 * Weights are normalized during selection, so they can be expressed as
 * percentages (0-100), priority scores, or any positive number. The relative
 * ratios between weights determine selection probability.
 *
 * A weight of 0 means the provider will never be selected during normal
 * weighted selection, but may still be used as a fallback if all weighted
 * providers fail.
 */
export interface WeightedProvider<TRequest = unknown> extends Provider<TRequest> {
  /**
   * Weight value for this provider
   *
   * Can be expressed as a percentage (0-100), priority score, or any
   * non-negative number. Weights are normalized relative to the sum
   * of all provider weights during selection.
   *
   * @minimum 0
   */
  weight: number
}

/**
 * Weighted strategy function type
 *
 * Similar to StrategyFunction, but takes an array of WeightedProvider
 * instances that include weight configuration.
 *
 * @template TRequest - Type of the request object (defaults to unknown)
 */
export type WeightedStrategyFunction<TRequest = unknown> = (
  providers: WeightedProvider<TRequest>[]
) => (request: TRequest) => Promise<ProviderSendResult>
