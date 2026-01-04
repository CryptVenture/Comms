import PushAdmProvider, { type AdmConfig } from './adm'
import PushApnProvider, { type ApnConfig } from './apn'
import PushFcmProvider, { type FcmConfig } from './fcm'
import PushLoggerProvider from '../logger'
import PushNotificationCatcherProvider from './notificationCatcher'
import PushWnsProvider, { type WnsConfig } from './wns'
import type { PushRequest } from '../../models/notification-request'

/**
 * Push Provider Interface
 *
 * All push notification providers must implement this interface.
 */
export interface PushProviderType {
  /**
   * Unique identifier for the provider
   */
  id: string

  /**
   * Sends a push notification
   *
   * @param request - Push notification request
   * @returns Promise resolving to the message ID
   */
  send(request: PushRequest): Promise<string>
}

/**
 * Push Provider Configuration
 *
 * Configuration for creating a push notification provider instance.
 */
export type PushProviderConfig =
  | LoggerProviderConfig
  | NotificationCatcherProviderConfig
  | CustomProviderConfig
  | AdmProviderConfig
  | ApnProviderConfig
  | FcmProviderConfig
  | WnsProviderConfig

/**
 * Logger provider configuration
 */
export interface LoggerProviderConfig {
  type: 'logger'
  [key: string]: unknown
}

/**
 * Notification catcher provider configuration
 */
export interface NotificationCatcherProviderConfig {
  type: 'notificationcatcher'
}

/**
 * Custom provider configuration
 */
export interface CustomProviderConfig extends PushProviderType {
  type: 'custom'
}

/**
 * ADM provider configuration
 */
export interface AdmProviderConfig extends AdmConfig {
  type: 'adm'
}

/**
 * APN provider configuration
 */
export interface ApnProviderConfig extends ApnConfig {
  type: 'apn'
}

/**
 * FCM provider configuration
 */
export interface FcmProviderConfig extends FcmConfig {
  type: 'fcm'
}

/**
 * WNS provider configuration
 */
export interface WnsProviderConfig extends WnsConfig {
  type: 'wns'
}

/**
 * Push Provider Factory
 *
 * Creates a push notification provider instance based on the configuration.
 *
 * @param config - Provider configuration
 * @returns Push provider instance
 * @throws {Error} If the provider type is unknown
 *
 * @example
 * ```typescript
 * // Create FCM provider
 * const fcmProvider = factory({
 *   type: 'fcm',
 *   id: 'your-server-key'
 * })
 *
 * // Create APN provider
 * const apnProvider = factory({
 *   type: 'apn',
 *   token: {
 *     key: './AuthKey.p8',
 *     keyId: 'ABC123',
 *     teamId: 'DEF456'
 *   },
 *   production: true
 * })
 *
 * // Create WNS provider
 * const wnsProvider = factory({
 *   type: 'wns',
 *   clientId: 'your-client-id',
 *   clientSecret: 'your-client-secret',
 *   notificationMethod: 'sendTileSquareBlock'
 * })
 *
 * // Create ADM provider
 * const admProvider = factory({
 *   type: 'adm',
 *   clientId: 'your-client-id',
 *   clientSecret: 'your-client-secret'
 * })
 *
 * // Create logger provider (development)
 * const loggerProvider = factory({
 *   type: 'logger'
 * })
 *
 * // Create notification catcher provider (development)
 * const catcherProvider = factory({
 *   type: 'notificationcatcher'
 * })
 *
 * // Create custom provider
 * const customProvider = factory({
 *   type: 'custom',
 *   id: 'my-custom-provider',
 *   send: async (request) => {
 *     // Custom implementation
 *     return 'message-id'
 *   }
 * })
 * ```
 */
export default function factory(config: PushProviderConfig): PushProviderType {
  const { type, ...restConfig } = config

  switch (type) {
    // Development providers
    case 'logger':
      return new PushLoggerProvider(restConfig, 'push')

    case 'notificationcatcher':
      return new PushNotificationCatcherProvider('push')

    // Custom provider
    case 'custom':
      return config as CustomProviderConfig

    // Platform providers
    case 'adm':
      return new PushAdmProvider(restConfig as AdmConfig)

    case 'apn':
      return new PushApnProvider(restConfig as ApnConfig)

    case 'fcm':
      return new PushFcmProvider(restConfig as FcmConfig)

    case 'wns':
      return new PushWnsProvider(restConfig as WnsConfig)

    default:
      // TypeScript will ensure this is never reached if all cases are handled
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      throw new Error(`Unknown push provider "${(config as any).type}".`)
  }
}
