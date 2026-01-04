/**
 * Notification Catcher Provider
 * Base class for providers that redirect notifications to local SMTP server
 *
 * @module providers/notificationCatcherProvider
 */

import EmailSmtpProvider from './email/smtp'
import { ProviderError } from '../types/errors'
import type { ChannelType } from '../types'
import type { EmailRequest } from '../models/notification-request'

/**
 * Notification Catcher SMTP Options
 */
export interface NotificationCatcherOptions {
  port?: number
  host?: string
  ignoreTLS?: boolean
  secure?: boolean
  auth?: {
    user: string
    pass: string
  }
}

/**
 * Notification Catcher Provider
 *
 * Base class for providers that capture notifications and send them to
 * a local SMTP server (default: localhost:1025) for testing purposes.
 * This is commonly used with tools like MailCatcher or MailDev.
 *
 * @example
 * ```typescript
 * class MyNotificationCatcher extends NotificationCatcherProvider {
 *   async send(request: MyRequestType): Promise<string> {
 *     return this.sendToCatcher({
 *       to: 'test@example.com',
 *       from: 'sender@example.com',
 *       subject: 'Test',
 *       text: 'Test message'
 *     })
 *   }
 * }
 * ```
 */
export default class NotificationCatcherProvider {
  readonly id: string
  private readonly provider: EmailSmtpProvider

  /**
   * Gets the notification catcher configuration for all specified channels
   *
   * @param channels - Array of channel types to configure
   * @returns Configuration object mapping channels to notification catcher settings
   *
   * @example
   * ```typescript
   * const config = NotificationCatcherProvider.getConfig([
   *   'email',
   *   'sms',
   *   'push'
   * ])
   * // Returns:
   * // {
   * //   email: {
   * //     providers: [{ type: 'notificationcatcher' }],
   * //     multiProviderStrategy: 'no-fallback'
   * //   },
   * //   sms: { ... },
   * //   push: { ... }
   * // }
   * ```
   */
  static getConfig(channels: ChannelType[]): Record<string, unknown> {
    return channels.reduce(
      (config, channel) => ({
        ...config,
        [channel]: {
          providers: [{ type: 'notificationcatcher' }],
          multiProviderStrategy: 'no-fallback',
        },
      }),
      {}
    )
  }

  /**
   * Creates a new notification catcher provider
   *
   * @param channel - The channel type this catcher is for
   * @throws {ProviderError} If SMTP provider initialization fails
   *
   * @example
   * ```typescript
   * const emailCatcher = new NotificationCatcherProvider('email')
   * const smsCatcher = new NotificationCatcherProvider('sms')
   * ```
   */
  constructor(channel: ChannelType) {
    this.id = `${channel}-notificationcatcher-provider`

    try {
      // Parse options from environment variable if available
      let options: NotificationCatcherOptions | string = {
        port: 1025,
        ignoreTLS: true,
      }

      if (process.env.COMMS_CATCHER_OPTIONS) {
        try {
          // Try to parse as JSON
          options = JSON.parse(process.env.COMMS_CATCHER_OPTIONS) as NotificationCatcherOptions
        } catch {
          // If parsing fails, use as connection string
          options = process.env.COMMS_CATCHER_OPTIONS
        }
      }

      // Create SMTP provider for notification catcher
      // NotificationCatcherOptions is compatible with SmtpConfig
      this.provider = new EmailSmtpProvider(options as string | import('./email/smtp').SmtpConfig)
    } catch (error) {
      throw new ProviderError(
        `Failed to initialize notification catcher: ${error instanceof Error ? error.message : String(error)}`,
        this.id,
        channel,
        'CATCHER_INIT_FAILED',
        error
      )
    }
  }

  /**
   * Sends a notification to the catcher via SMTP
   *
   * @param request - Email request to send to the catcher
   * @returns Message ID from SMTP server
   * @throws {ProviderError} If sending fails
   *
   * @example
   * ```typescript
   * const catcher = new NotificationCatcherProvider('sms')
   *
   * const messageId = await catcher.sendToCatcher({
   *   to: '+1234567890@sms',
   *   from: 'system',
   *   subject: 'SMS Notification',
   *   text: 'Your verification code is 123456',
   *   headers: {
   *     'X-type': 'sms',
   *     'X-to': '[sms] +1234567890'
   *   }
   * })
   * ```
   */
  protected async sendToCatcher(request: EmailRequest): Promise<string> {
    try {
      return await this.provider.send(request)
    } catch (error) {
      throw new ProviderError(
        `Failed to send to notification catcher: ${error instanceof Error ? error.message : String(error)}`,
        this.id,
        undefined,
        'CATCHER_SEND_FAILED',
        error
      )
    }
  }
}
