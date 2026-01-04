/**
 * Webpush Provider Factory
 * Creates webpush notification providers based on configuration
 *
 * @module providers/webpush
 */

import WebpushGcmProvider from './gcm'
import WebpushLoggerProvider from '../logger'
import WebpushNotificationCatcherProvider from './notificationCatcher'
import { ProviderError } from '../../types/errors'
import type { WebpushRequest } from '../../models/notification-request'
import type { ProviderConfig } from '../../types/config'

/**
 * Webpush provider interface
 */
export interface WebpushProvider {
  id: string
  send(request: WebpushRequest): Promise<string>
}

/**
 * Webpush provider configuration
 */
export interface WebpushProviderConfig extends ProviderConfig {
  type: 'logger' | 'notificationcatcher' | 'custom' | 'gcm'
}

/**
 * GCM/FCM provider configuration
 */
export interface WebpushGcmConfig extends WebpushProviderConfig {
  type: 'gcm'
  gcmAPIKey?: string
  vapidDetails?: {
    subject: string
    publicKey: string
    privateKey: string
  }
  ttl?: number
  headers?: Record<string, string | number | boolean>
}

/**
 * Custom webpush provider configuration
 */
export interface CustomWebpushProviderConfig extends WebpushProviderConfig {
  type: 'custom'
  id: string
  send(request: WebpushRequest): Promise<string>
}

/**
 * Factory function to create webpush providers
 *
 * @param config - Provider configuration object
 * @returns Configured webpush provider instance
 * @throws {ProviderError} If provider type is unknown
 *
 * @example
 * ```typescript
 * // Create GCM provider
 * const provider = factory({
 *   type: 'gcm',
 *   gcmAPIKey: 'YOUR_GCM_API_KEY'
 * })
 *
 * // Create provider with VAPID
 * const vapidProvider = factory({
 *   type: 'gcm',
 *   vapidDetails: {
 *     subject: 'mailto:admin@example.com',
 *     publicKey: '...',
 *     privateKey: '...'
 *   }
 * })
 * ```
 */
export default function factory(
  config: WebpushProviderConfig & Record<string, unknown>
): WebpushProvider {
  const { type, ...rest } = config

  try {
    switch (type) {
      // Development
      case 'logger':
        return new WebpushLoggerProvider(rest, 'webpush')

      case 'notificationcatcher':
        return new WebpushNotificationCatcherProvider('webpush')

      // Custom
      case 'custom':
        if (!config.id || typeof config.send !== 'function') {
          throw new ProviderError(
            'Custom provider must have id and send function',
            'webpush-custom-provider',
            'webpush',
            'INVALID_CONFIG'
          )
        }
        return config as unknown as WebpushProvider

      // Providers
      case 'gcm':
        return new WebpushGcmProvider(rest as Omit<WebpushGcmConfig, 'type'>)

      default:
        throw new ProviderError(
          `Unknown webpush provider "${type}"`,
          'webpush-factory',
          'webpush',
          'UNKNOWN_PROVIDER'
        )
    }
  } catch (error) {
    if (error instanceof ProviderError) {
      throw error
    }
    throw new ProviderError(
      `Failed to create webpush provider: ${error instanceof Error ? error.message : String(error)}`,
      'webpush-factory',
      'webpush',
      'PROVIDER_CREATION_FAILED',
      error
    )
  }
}
