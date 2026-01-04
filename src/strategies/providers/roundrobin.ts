/**
 * Round-Robin Strategy
 *
 * Distributes notifications across multiple providers in a rotating fashion.
 * This is a stateful strategy that maintains the rotation state between calls.
 * Each send rotates to the next provider, then uses fallback logic for that attempt.
 *
 * This strategy is ideal for load balancing across multiple providers while
 * maintaining fallback capabilities for each send attempt.
 *
 * @module strategies/providers/roundrobin
 *
 * @example
 * ```typescript
 * import strategyRoundRobin from './roundrobin'
 * import type { Provider } from '../../types'
 *
 * // Setup providers
 * const providers: Provider[] = [
 *   { id: 'provider-a', send: async (req) => 'msg-a' },
 *   { id: 'provider-b', send: async (req) => 'msg-b' },
 *   { id: 'provider-c', send: async (req) => 'msg-c' }
 * ]
 *
 * // Create strategy function
 * const sendWithRoundRobin = strategyRoundRobin(providers)
 *
 * // First send - tries provider-a first, then b, then c if needed
 * const result1 = await sendWithRoundRobin({ to: 'user1@example.com' })
 *
 * // Second send - tries provider-b first, then c, then a if needed
 * const result2 = await sendWithRoundRobin({ to: 'user2@example.com' })
 *
 * // Third send - tries provider-c first, then a, then b if needed
 * const result3 = await sendWithRoundRobin({ to: 'user3@example.com' })
 * ```
 *
 * @example Load balancing with custom types
 * ```typescript
 * interface PushRequest {
 *   deviceToken: string
 *   title: string
 *   body: string
 * }
 *
 * const pushProviders: Provider<PushRequest>[] = [
 *   { id: 'fcm-primary', send: async (req) => 'fcm-1' },
 *   { id: 'fcm-secondary', send: async (req) => 'fcm-2' }
 * ]
 *
 * const sendPush = strategyRoundRobin<PushRequest>(pushProviders)
 *
 * // Distributes load across providers
 * await sendPush({ deviceToken: 'token1', title: 'Hi', body: 'Message' })
 * await sendPush({ deviceToken: 'token2', title: 'Hi', body: 'Message' })
 * ```
 *
 * @remarks
 * This strategy maintains state through array mutation. Each call to the returned
 * send function rotates the providers array, ensuring fair distribution of load.
 * The rotation happens before each send, and then fallback logic is applied to
 * the rotated array.
 */

import strategyFallback from './fallback'
import type { Provider } from '../../types'
import type { StrategyFunction } from '../../types/strategies'

/**
 * Rotates an array by moving elements from one end to the other
 *
 * @template T - Type of array elements
 * @param arr - Array to rotate (mutated in place)
 * @param forward - If true, rotate forward (shift to push), else backward (pop to unshift)
 * @returns The mutated array
 *
 * @remarks
 * This function mutates the input array. The mutation serves as the state
 * mechanism for the round-robin strategy.
 *
 * @internal
 */
function rotate<T>(arr: T[], forward: boolean): T[] {
  // Validate array has elements
  if (arr.length === 0) {
    return arr
  }

  if (forward) {
    // Move first element to end
    const first = arr.shift()
    if (first !== undefined) {
      arr.push(first)
    }
  } else {
    // Move last element to beginning
    const last = arr.pop()
    if (last !== undefined) {
      arr.unshift(last)
    }
  }

  return arr
}

/**
 * Round-robin strategy implementation
 *
 * Returns a function that rotates through providers on each send attempt.
 * The rotation ensures fair distribution of load across providers. After
 * rotation, the fallback strategy is applied, meaning if the primary provider
 * (after rotation) fails, it will try the next one, and so on.
 *
 * @template TRequest - Type of the request object (defaults to unknown)
 * @param providers - Array of providers to rotate through
 * @returns Send function that implements round-robin with fallback logic
 *
 * @throws Error if providers array is empty
 * @throws Error from last provider if all providers fail on a send attempt
 *
 * @remarks
 * This is not equivalent to `(providers) => strategyFallback(rotate(providers))`
 * because of memoization. The rotation must happen on each send, not just once
 * during strategy initialization. The providers array is mutated to maintain
 * state between calls.
 */
const strategyRoundRobin: StrategyFunction = <TRequest = unknown>(
  providers: Provider<TRequest>[]
) => {
  // Validate providers array
  if (!providers || providers.length === 0) {
    throw new Error('Round-robin strategy requires at least one provider')
  }

  // Initialize rotation state with backward rotation
  // This prepares the array for the first forward rotation
  const rotatedProviders = rotate(providers, false)

  // Return the send function
  return (request: TRequest) => {
    // Rotate forward before each send to distribute load
    rotate(rotatedProviders, true)

    // Apply fallback strategy to the rotated array
    return strategyFallback(rotatedProviders)(request)
  }
}

export default strategyRoundRobin
