/**
 * WhatsApp Notification Catcher Provider
 * Redirects WhatsApp messages to local SMTP server for testing
 *
 * @module providers/whatsapp/notificationCatcher
 */

import NotificationCatcherProvider from '../notificationCatcherProvider'
import { ProviderError } from '../../types/errors'
import type { WhatsappRequest } from '../../models/notification-request'

/**
 * WhatsApp Notification Catcher Provider
 *
 * Captures WhatsApp message requests and sends them to a local SMTP server
 * for testing and development purposes. This is useful for testing
 * WhatsApp integrations without sending actual messages.
 *
 * @example
 * ```typescript
 * const provider = new WhatsappCatcherProvider('whatsapp')
 *
 * await provider.send({
 *   from: '447860099299',
 *   to: '447860000000',
 *   type: 'text',
 *   text: 'Hello from WhatsApp!'
 * })
 * // Message details sent to localhost:1025 as email
 * ```
 */
export default class WhatsappCatcherProvider extends NotificationCatcherProvider {
  /**
   * Sends WhatsApp message to notification catcher
   *
   * @param request - WhatsApp message request
   * @returns Empty string
   * @throws {ProviderError} If sending to catcher fails
   *
   * @example
   * ```typescript
   * await provider.send({
   *   from: '447860099299',
   *   to: '447860000000',
   *   type: 'text',
   *   text: 'Test message'
   * })
   *
   * // Template message
   * await provider.send({
   *   from: '447860099299',
   *   to: '447860000000',
   *   type: 'template',
   *   templateName: 'welcome',
   *   templateData: { name: 'John' }
   * })
   * ```
   */
  async send(request: WhatsappRequest): Promise<string> {
    try {
      // Apply customization if provided
      const customizedRequest = request.customize
        ? await request.customize(this.id, request)
        : request

      const { from, to, text, ...rest } = customizedRequest

      // Validate required fields
      if (!from || !to) {
        throw new ProviderError(
          'WhatsApp request must include from and to',
          this.id,
          'whatsapp',
          'INVALID_REQUEST'
        )
      }

      // Create subject from text if available
      const subject = text ? `${text.substring(0, 20)}${text.length > 20 ? '...' : ''}` : ''

      // Send to notification catcher via SMTP
      await this.sendToCatcher({
        to: `${to}@whatsapp`,
        from,
        subject,
        text: JSON.stringify({ text, ...rest }, null, 2),
        headers: {
          'X-type': 'whatsapp',
          'X-to': `[whatsapp] ${to}`,
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
        'whatsapp',
        'CATCHER_SEND_FAILED',
        error
      )
    }
  }
}
