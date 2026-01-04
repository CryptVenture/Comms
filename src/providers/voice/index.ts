/**
 * Voice Provider Factory
 * Creates voice notification providers based on configuration
 *
 * @module providers/voice
 */

import VoiceLoggerProvider from '../logger'
import VoiceNotificationCatcherProvider from './notificationCatcher'
import VoiceTwilioProvider, { type TwilioConfig } from './twilio'
import { ProviderError } from '../../types/errors'
import type { VoiceRequest } from '../../models/notification-request'
import type { ProviderConfig } from '../../types/config'

/**
 * Voice provider interface
 */
export interface VoiceProvider {
  id: string
  send(request: VoiceRequest): Promise<string>
}

/**
 * Voice provider configuration
 */
export interface VoiceProviderConfig extends ProviderConfig {
  type: 'logger' | 'notificationcatcher' | 'custom' | 'twilio'
}

/**
 * Twilio provider configuration
 */
export interface VoiceTwilioConfig extends VoiceProviderConfig {
  type: 'twilio'
  accountSid: string
  authToken: string
}

/**
 * Custom voice provider configuration
 */
export interface CustomVoiceProviderConfig extends VoiceProviderConfig {
  type: 'custom'
  id: string
  send(request: VoiceRequest): Promise<string>
}

/**
 * Factory function to create voice providers
 *
 * @param config - Provider configuration object
 * @returns Configured voice provider instance
 * @throws {ProviderError} If provider type is unknown
 *
 * @example
 * ```typescript
 * // Create Twilio provider
 * const provider = factory({
 *   type: 'twilio',
 *   accountSid: 'AC...',
 *   authToken: '...'
 * })
 *
 * // Create logger provider
 * const logger = factory({ type: 'logger' })
 * ```
 */
export default function factory(
  config: VoiceProviderConfig & Record<string, unknown>
): VoiceProvider {
  const { type, ...rest } = config

  try {
    switch (type) {
      // Development
      case 'logger':
        return new VoiceLoggerProvider(rest, 'voice')

      case 'notificationcatcher':
        return new VoiceNotificationCatcherProvider('voice')

      // Custom
      case 'custom':
        if (!config.id || typeof config.send !== 'function') {
          throw new ProviderError(
            'Custom provider must have id and send function',
            'voice-custom-provider',
            'voice',
            'INVALID_CONFIG'
          )
        }
        return config as CustomVoiceProviderConfig as VoiceProvider

      // Providers
      case 'twilio':
        return new VoiceTwilioProvider(rest as unknown as TwilioConfig)

      default:
        throw new ProviderError(
          `Unknown voice provider "${type}"`,
          'voice-factory',
          'voice',
          'UNKNOWN_PROVIDER'
        )
    }
  } catch (error) {
    if (error instanceof ProviderError) {
      throw error
    }
    throw new ProviderError(
      `Failed to create voice provider: ${error instanceof Error ? error.message : String(error)}`,
      'voice-factory',
      'voice',
      'PROVIDER_CREATION_FAILED',
      error
    )
  }
}
