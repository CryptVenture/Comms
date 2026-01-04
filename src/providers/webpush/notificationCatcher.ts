/**
 * Webpush Notification Catcher Provider
 * Redirects webpush notifications to local SMTP server for testing
 *
 * @module providers/webpush/notificationCatcher
 */

import NotificationCatcherProvider from '../notificationCatcherProvider'
import { ProviderError } from '../../types/errors'
import type { WebpushRequest } from '../../models/notification-request'

/**
 * Webpush Notification Catcher Provider
 *
 * Captures webpush notification requests and sends them to a local SMTP server
 * for testing and development purposes. This is useful for testing
 * webpush flows without setting up actual push subscriptions.
 *
 * @example
 * ```typescript
 * const provider = new WebpushNotificationCatcherProvider('webpush')
 *
 * await provider.send({
 *   subscription: { ... },
 *   title: 'Hello',
 *   body: 'World'
 * })
 * // Notification details sent to localhost:1025 as email
 * ```
 */
export default class WebpushNotificationCatcherProvider extends NotificationCatcherProvider {
  /**
   * Sends webpush notification to notification catcher
   *
   * @param request - Webpush notification request
   * @returns Message ID from SMTP server
   * @throws {ProviderError} If sending to catcher fails
   *
   * @example
   * ```typescript
   * const messageId = await provider.send({
   *   subscription: {
   *     endpoint: 'https://...',
   *     keys: { auth: '...', p256dh: '...' }
   *   },
   *   title: 'Test Notification',
   *   body: 'This is a test',
   *   userId: 'user123'
   * })
   * ```
   */
  async send(request: WebpushRequest): Promise<string> {
    try {
      // Apply customization if provided
      const customizedRequest = request.customize
        ? await request.customize(this.id, request)
        : request

      const { subscription: _subscription, title, ...rest } = customizedRequest

      // Extract userId
      const userId = rest.userId
      const userIdForEmail = userId || 'user'
      const userIdForHeader = userId || ''

      // Validate required fields
      if (!title) {
        throw new ProviderError(
          'Webpush request must include title',
          this.id,
          'webpush',
          'INVALID_REQUEST'
        )
      }

      // Send to notification catcher via SMTP
      return await this.sendToCatcher({
        to: `${userIdForEmail}@webpush`,
        from: '-',
        subject: title,
        headers: {
          'X-type': 'webpush',
          'X-to': `[webpush] ${userIdForHeader}`,
          'X-payload': JSON.stringify({ title, ...rest }),
        },
      })
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error
      }

      throw new ProviderError(
        `Failed to send to notification catcher: ${error instanceof Error ? error.message : String(error)}`,
        this.id,
        'webpush',
        'CATCHER_SEND_FAILED',
        error
      )
    }
  }
}
