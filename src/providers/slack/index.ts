/**
 * Slack Provider Factory
 * Creates Slack notification providers based on configuration
 *
 * @module providers/slack
 */

import SlackProvider, { type SlackConfig } from './slack'
import SlackLoggingProvider from '../logger'
import SlackNotificationCatcherProvider from './notificationCatcher'
import { ProviderError } from '../../types/errors'
import type { SlackRequest } from '../../models/notification-request'
import type { ProviderConfig } from '../../types/config'

/**
 * Slack provider interface
 */
export interface SlackProviderInterface {
  id: string
  send(request: SlackRequest): Promise<string>
}

/**
 * Slack provider configuration
 */
export interface SlackProviderConfig extends ProviderConfig {
  type: 'logger' | 'notificationcatcher' | 'custom' | 'webhook'
}

/**
 * Slack webhook provider configuration
 */
export interface SlackWebhookConfig extends SlackProviderConfig {
  type: 'webhook'
  webhookUrl: string
}

/**
 * Custom Slack provider configuration
 */
export interface CustomSlackProviderConfig extends SlackProviderConfig {
  type: 'custom'
  id: string
  send(request: SlackRequest): Promise<string>
}

/**
 * Factory function to create Slack providers
 *
 * @param config - Provider configuration object
 * @returns Configured Slack provider instance
 * @throws {ProviderError} If provider type is unknown
 *
 * @example
 * ```typescript
 * // Create webhook provider
 * const provider = factory({
 *   type: 'webhook',
 *   webhookUrl: 'https://hooks.slack.com/services/...'
 * })
 *
 * // Create logger provider
 * const logger = factory({ type: 'logger' })
 * ```
 */
export default function factory(
  config: SlackProviderConfig & Record<string, unknown>
): SlackProviderInterface {
  const { type, ...rest } = config

  try {
    switch (type) {
      // Development
      case 'logger':
        return new SlackLoggingProvider(rest, 'slack')

      case 'notificationcatcher':
        return new SlackNotificationCatcherProvider('slack')

      // Custom
      case 'custom':
        if (!config.id || typeof config.send !== 'function') {
          throw new ProviderError(
            'Custom provider must have id and send function',
            'slack-custom-provider',
            'slack',
            'INVALID_CONFIG'
          )
        }
        return config as CustomSlackProviderConfig as SlackProviderInterface

      // Providers
      case 'webhook':
        return new SlackProvider(rest as unknown as SlackConfig)

      default:
        throw new ProviderError(
          `Unknown slack provider "${type}"`,
          'slack-factory',
          'slack',
          'UNKNOWN_PROVIDER'
        )
    }
  } catch (error) {
    if (error instanceof ProviderError) {
      throw error
    }
    throw new ProviderError(
      `Failed to create slack provider: ${error instanceof Error ? error.message : String(error)}`,
      'slack-factory',
      'slack',
      'PROVIDER_CREATION_FAILED',
      error
    )
  }
}
