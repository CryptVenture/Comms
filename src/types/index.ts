/**
 * Base type definitions for WebVentures Comms SDK
 * Compatible with React 19, Next.js 16+, React Native, and SSR environments
 */

export * from './errors'
export * from './config'
export * from './providers'
export * from './requests'
export * from './responses'
export * from './strategies'

/**
 * Channel types supported by the SDK
 */
export type ChannelType =
  | 'email'
  | 'sms'
  | 'push'
  | 'voice'
  | 'webpush'
  | 'slack'
  | 'whatsapp'
  | 'telegram'

/**
 * Multi-provider strategy types
 */
export type MultiProviderStrategyType = 'fallback' | 'roundrobin' | 'no-fallback' | 'weighted'

/**
 * Logger instance type (Winston)
 */
export interface LoggerInstance {
  error(message: string, ...meta: unknown[]): void
  warn(message: string, ...meta: unknown[]): void
  info(message: string, ...meta: unknown[]): void
  debug(message: string, ...meta: unknown[]): void
  mute(): void
  configure(transports: unknown[]): void
}

/**
 * Base provider interface
 */
export interface Provider<TRequest = unknown> {
  id: string
  send(request: TRequest): Promise<string>
}

/**
 * Provider factory function type
 */
export type ProviderFactory<TConfig = unknown, TRequest = unknown> = (
  config: TConfig
) => Provider<TRequest>

/**
 * Utility types for better DX
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
  }[Keys]

/**
 * Framework-specific type guards
 */
export const isServer = (): boolean => {
  return typeof (globalThis as { window?: unknown }).window === 'undefined'
}

export const isReactNative = (): boolean => {
  return (
    typeof (globalThis as { navigator?: unknown }).navigator !== 'undefined' &&
    ((globalThis as { navigator?: { product?: string } }).navigator as { product?: string })
      ?.product === 'ReactNative'
  )
}

export const isNextJS = (): boolean => {
  return (
    typeof process !== 'undefined' &&
    (process.env as { __NEXT_PROCESSED_ENV?: unknown }).__NEXT_PROCESSED_ENV !== undefined
  )
}
