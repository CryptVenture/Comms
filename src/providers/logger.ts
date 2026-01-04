/**
 * Logger Provider
 * Universal logging provider for all notification channels
 *
 * @module providers/logger
 */

import logger from '../util/logger'
import { ProviderError } from '../types/errors'
import type { ChannelType } from '../types'
import type { RequestType } from './index'

/**
 * Logger Provider Configuration
 */
export interface LoggerProviderConfig {
  // Reserved for future configuration options
  [key: string]: unknown
}

/**
 * Logger Provider
 *
 * A universal provider that logs notification requests instead of sending them.
 * Useful for development, debugging, and testing purposes.
 *
 * @example
 * ```typescript
 * const emailLogger = new LoggerProvider({}, 'email')
 *
 * await emailLogger.send({
 *   from: 'sender@example.com',
 *   to: 'recipient@example.com',
 *   subject: 'Test',
 *   text: 'Test message'
 * })
 * // Logs: [EMAIL] Sent by "email-logger-provider":
 * // { from: 'sender@example.com', to: 'recipient@example.com', ... }
 * ```
 */
export default class LoggerProvider<TRequest extends RequestType = RequestType> {
  readonly id: string
  private readonly channel: ChannelType

  /**
   * Creates a new logger provider
   *
   * @param config - Logger configuration (reserved for future use)
   * @param channel - The channel type this logger is for
   *
   * @example
   * ```typescript
   * const smsLogger = new LoggerProvider({}, 'sms')
   * const pushLogger = new LoggerProvider({}, 'push')
   * const voiceLogger = new LoggerProvider({}, 'voice')
   * ```
   */
  constructor(_config: LoggerProviderConfig, channel: ChannelType) {
    this.id = `${channel}-logger-provider`
    this.channel = channel
  }

  /**
   * Logs a notification request
   *
   * @param request - The notification request to log
   * @returns A randomly generated ID simulating a successful send
   *
   * @example
   * ```typescript
   * const provider = new LoggerProvider({}, 'sms')
   *
   * const id = await provider.send({
   *   from: '+1234567890',
   *   to: '+0987654321',
   *   text: 'Hello World'
   * })
   * // Returns: "id-123456789"
   * ```
   */
  async send(request: TRequest): Promise<string> {
    try {
      // Log the channel and provider ID
      logger.info(`[${this.channel.toUpperCase()}] Sent by "${this.id}":`)

      // Log the request details
      logger.info(request)

      // Generate a random ID to simulate a successful send
      const randomId = `id-${Math.round(Math.random() * 1000000000)}`

      return randomId
    } catch (error) {
      throw new ProviderError(
        `Logger provider failed: ${error instanceof Error ? error.message : String(error)}`,
        this.id,
        this.channel,
        'LOGGER_ERROR',
        error
      )
    }
  }
}
