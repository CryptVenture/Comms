/**
 * Telegram Notification Catcher Provider
 * Redirects Telegram messages to local SMTP server for testing
 *
 * @module providers/telegram/notificationCatcher
 */

import NotificationCatcherProvider from '../notificationCatcherProvider'
import { ProviderError } from '../../types/errors'
import type { TelegramRequest } from '../../models/notification-request'

/**
 * Telegram Notification Catcher Provider
 *
 * Captures Telegram message requests and sends them to a local SMTP server
 * for testing and development purposes. This is useful for testing
 * Telegram integrations without sending actual messages to Telegram.
 *
 * @example
 * ```typescript
 * const provider = new TelegramCatcherProvider('telegram')
 *
 * await provider.send({
 *   chatId: '-1001234567890',
 *   text: 'Hello from Telegram!',
 *   parseMode: 'HTML'
 * })
 * // Message details sent to localhost:1025 as email
 * ```
 */
export default class TelegramCatcherProvider extends NotificationCatcherProvider {
  /**
   * Sends Telegram message to notification catcher
   *
   * @param request - Telegram message request
   * @returns Message ID from SMTP server
   * @throws {ProviderError} If sending to catcher fails
   *
   * @example
   * ```typescript
   * const messageId = await provider.send({
   *   chatId: '-1001234567890',
   *   text: 'Deployment notification',
   *   parseMode: 'HTML'
   * })
   * ```
   */
  async send(request: TelegramRequest): Promise<string> {
    try {
      // Apply customization if provided
      const customizedRequest = request.customize
        ? await request.customize(this.id, request)
        : request

      const { chatId, text } = customizedRequest

      // Validate required fields
      if (!chatId) {
        throw new ProviderError(
          'Telegram request must include chatId',
          this.id,
          'telegram',
          'INVALID_REQUEST'
        )
      }

      if (!text) {
        throw new ProviderError(
          'Telegram request must include text',
          this.id,
          'telegram',
          'INVALID_REQUEST'
        )
      }

      // Truncate text for subject line
      const subject = `${text.substring(0, 20)}${text.length > 20 ? '...' : ''}`

      // Send to notification catcher via SMTP
      await this.sendToCatcher({
        to: `${chatId}@telegram`,
        from: '-',
        subject,
        text,
        headers: {
          'X-type': 'telegram',
          'X-to': `[telegram] ${chatId}`,
        },
      })

      return ''
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error
      }

      throw new ProviderError(
        `Failed to send to notification catcher: ${error instanceof Error ? error.message : String(error)}`,
        this.id,
        'telegram',
        'CATCHER_SEND_FAILED',
        error
      )
    }
  }
}
