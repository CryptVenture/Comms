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
 * for testing and development purposes.
 * Implementation to be completed in subtask 2.3.
 */
export default class TelegramCatcherProvider extends NotificationCatcherProvider {
  /**
   * Sends Telegram message to notification catcher
   *
   * @param request - Telegram message request
   * @returns Message ID from SMTP server
   * @throws {ProviderError} If sending to catcher fails
   */
  async send(_request: TelegramRequest): Promise<string> {
    // Stub implementation - will be completed in subtask 2.3
    throw new ProviderError(
      'TelegramCatcherProvider.send() not yet implemented',
      this.id,
      'telegram',
      'NOT_IMPLEMENTED'
    )
  }
}
