/**
 * Configuration types for WebVentures Comms SDK
 */

import type { MultiProviderStrategyType } from './index'
import type { StrategyFunction } from './strategies'

/**
 * Provider configuration for any channel
 */
export interface ProviderConfig {
  type: string
  id?: string
  [key: string]: unknown
}

/**
 * Custom provider configuration
 */
export interface CustomProviderConfig<TRequest = unknown> extends ProviderConfig {
  type: 'custom'
  id: string
  send: (request: TRequest) => Promise<string>
}

/**
 * Logger provider configuration
 */
export interface LoggerProviderConfig extends ProviderConfig {
  type: 'logger'
}

/**
 * Channel configuration
 */
export interface ChannelConfig<TProviderConfig extends ProviderConfig = ProviderConfig> {
  providers: TProviderConfig[]
  multiProviderStrategy?: MultiProviderStrategyType | StrategyFunction
}

/**
 * SDK configuration
 */
export interface CommsSdkConfig {
  /**
   * If true, all notifications are sent to the notification catcher (localhost:1025)
   * Overrides all channel configurations
   */
  useNotificationCatcher?: boolean

  /**
   * Channel-specific configurations
   */
  channels?: {
    email?: ChannelConfig
    sms?: ChannelConfig
    push?: ChannelConfig
    voice?: ChannelConfig
    webpush?: ChannelConfig
    slack?: ChannelConfig
    whatsapp?: ChannelConfig
    [customChannel: string]: ChannelConfig | undefined
  }
}

/**
 * Environment configuration
 */
export interface EnvironmentConfig {
  /**
   * HTTP proxy URL (e.g., http://127.0.0.1:8580)
   * Can also be set via COMMS_HTTP_PROXY environment variable
   */
  httpProxy?: string

  /**
   * Notification catcher SMTP URL
   * Can also be set via COMMS_CATCHER_OPTIONS environment variable
   */
  catcherOptions?: string

  /**
   * Whether running in SSR environment
   */
  isSSR?: boolean

  /**
   * Whether running in React Native
   */
  isReactNative?: boolean

  /**
   * Whether running in Next.js
   */
  isNextJS?: boolean

  /**
   * Whether running in Expo
   */
  isExpo?: boolean
}

/**
 * Helper to detect environment
 */
export function detectEnvironment(): EnvironmentConfig {
  const isSSR = typeof globalThis !== 'undefined' && !('window' in globalThis)
  const isReactNative =
    typeof globalThis.navigator !== 'undefined' &&
    'product' in globalThis.navigator &&
    (globalThis.navigator as typeof globalThis.navigator & { product?: string }).product ===
      'ReactNative'
  const isNextJS =
    typeof process !== 'undefined' &&
    process.env !== undefined &&
    '__NEXT_PROCESSED_ENV' in process.env
  const isExpo = typeof globalThis !== 'undefined' && '__expo' in globalThis

  return {
    httpProxy: process.env.COMMS_HTTP_PROXY,
    catcherOptions: process.env.COMMS_CATCHER_OPTIONS,
    isSSR,
    isReactNative,
    isNextJS,
    isExpo,
  }
}
