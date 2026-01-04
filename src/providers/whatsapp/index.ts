/**
 * WhatsApp Provider Factory
 * Creates WhatsApp notification providers based on configuration
 *
 * @module providers/whatsapp
 */

import WhatsappInfobipProvider, { type InfobipConfig } from './infobip'
import WhatsappLoggingProvider from '../logger'
import WhatsappNotificationCatcherProvider from './notificationCatcher'
import { ProviderError } from '../../types/errors'
import type { WhatsappRequest } from '../../models/notification-request'
import type { ProviderConfig } from '../../types/config'

/**
 * WhatsApp provider interface
 */
export interface WhatsappProvider {
  id: string
  send(request: WhatsappRequest): Promise<string>
}

/**
 * WhatsApp provider configuration
 */
export interface WhatsappProviderConfig extends ProviderConfig {
  type: 'logger' | 'notificationcatcher' | 'custom' | 'infobip'
}

/**
 * Infobip provider configuration
 */
export interface WhatsappInfobipConfig extends WhatsappProviderConfig {
  type: 'infobip'
  baseUrl: string
  apiKey: string
}

/**
 * Custom WhatsApp provider configuration
 */
export interface CustomWhatsappProviderConfig extends WhatsappProviderConfig {
  type: 'custom'
  id: string
  send(request: WhatsappRequest): Promise<string>
}

/**
 * Factory function to create WhatsApp providers
 *
 * @param config - Provider configuration object
 * @returns Configured WhatsApp provider instance
 * @throws {ProviderError} If provider type is unknown
 *
 * @example
 * ```typescript
 * // Create Infobip provider
 * const provider = factory({
 *   type: 'infobip',
 *   baseUrl: 'https://api.infobip.com',
 *   apiKey: 'YOUR_API_KEY'
 * })
 *
 * // Create logger provider
 * const logger = factory({ type: 'logger' })
 * ```
 */
export default function factory(
  config: WhatsappProviderConfig & Record<string, unknown>
): WhatsappProvider {
  const { type, ...rest } = config

  try {
    switch (type) {
      // Development
      case 'logger':
        return new WhatsappLoggingProvider(rest, 'whatsapp')

      case 'notificationcatcher':
        return new WhatsappNotificationCatcherProvider('whatsapp')

      // Custom
      case 'custom':
        if (!config.id || typeof config.send !== 'function') {
          throw new ProviderError(
            'Custom provider must have id and send function',
            'whatsapp-custom-provider',
            'whatsapp',
            'INVALID_CONFIG'
          )
        }
        return config as CustomWhatsappProviderConfig as WhatsappProvider

      // Providers
      case 'infobip':
        return new WhatsappInfobipProvider(rest as unknown as InfobipConfig)

      default:
        throw new ProviderError(
          `Unknown whatsapp provider "${type}"`,
          'whatsapp-factory',
          'whatsapp',
          'UNKNOWN_PROVIDER'
        )
    }
  } catch (error) {
    if (error instanceof ProviderError) {
      throw error
    }
    throw new ProviderError(
      `Failed to create whatsapp provider: ${error instanceof Error ? error.message : String(error)}`,
      'whatsapp-factory',
      'whatsapp',
      'PROVIDER_CREATION_FAILED',
      error
    )
  }
}
