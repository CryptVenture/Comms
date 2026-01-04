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
