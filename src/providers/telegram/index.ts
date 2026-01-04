/**
 * Telegram Provider Factory
 * Creates Telegram notification providers based on configuration
 *
 * @module providers/telegram
 */

import TelegramProvider, { type TelegramConfig } from './telegram'
import TelegramLoggingProvider from '../logger'
import TelegramNotificationCatcherProvider from './notificationCatcher'
import { ProviderError } from '../../types/errors'
import type { TelegramRequest } from '../../models/notification-request'
import type { ProviderConfig } from '../../types/config'

/**
 * Telegram provider interface
 */
export interface TelegramProviderInterface {
  id: string
  send(request: TelegramRequest): Promise<string>
}

/**
 * Telegram provider configuration
 */
export interface TelegramProviderConfig extends ProviderConfig {
  type: 'logger' | 'notificationcatcher' | 'custom' | 'telegram-bot'
}

/**
 * Telegram Bot API provider configuration
 */
export interface TelegramBotConfig extends TelegramProviderConfig {
  type: 'telegram-bot'
  botToken: string
  chatId?: string
}

/**
 * Custom Telegram provider configuration
 */
export interface CustomTelegramProviderConfig extends TelegramProviderConfig {
  type: 'custom'
  id: string
  send(request: TelegramRequest): Promise<string>
}

/**
 * Factory function to create Telegram providers
 *
 * @param config - Provider configuration object
 * @returns Configured Telegram provider instance
 * @throws {ProviderError} If provider type is unknown
 *
 * @example
 * ```typescript
 * // Create Telegram Bot API provider
 * const provider = factory({
 *   type: 'telegram-bot',
 *   botToken: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz'
 * })
 *
 * // Create logger provider
 * const logger = factory({ type: 'logger' })
 * ```
 */
export default function factory(
  config: TelegramProviderConfig & Record<string, unknown>
): TelegramProviderInterface {
  const { type, ...rest } = config

  try {
    switch (type) {
      // Development
      case 'logger':
        return new TelegramLoggingProvider(rest, 'telegram')

      case 'notificationcatcher':
        return new TelegramNotificationCatcherProvider('telegram')

      // Custom
      case 'custom':
        if (!config.id || typeof config.send !== 'function') {
          throw new ProviderError(
            'Custom provider must have id and send function',
            'telegram-custom-provider',
            'telegram',
            'INVALID_CONFIG'
          )
        }
        return config as CustomTelegramProviderConfig as TelegramProviderInterface

      // Providers
      case 'telegram-bot':
        return new TelegramProvider(rest as unknown as TelegramConfig)

      default:
        throw new ProviderError(
          `Unknown telegram provider "${type}"`,
          'telegram-factory',
          'telegram',
          'UNKNOWN_PROVIDER'
        )
    }
  } catch (error) {
    if (error instanceof ProviderError) {
      throw error
    }
    throw new ProviderError(
      `Failed to create telegram provider: ${error instanceof Error ? error.message : String(error)}`,
      'telegram-factory',
      'telegram',
      'PROVIDER_CREATION_FAILED',
      error
    )
  }
}
