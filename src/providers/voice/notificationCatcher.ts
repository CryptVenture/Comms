/**
 * Voice Notification Catcher Provider
 * Redirects voice calls to local SMTP server for testing
 *
 * @module providers/voice/notificationCatcher
 */

import NotificationCatcherProvider from '../notificationCatcherProvider'
import { ProviderError } from '../../types/errors'
import type { VoiceRequest } from '../../models/notification-request'

/**
 * Voice Notification Catcher Provider
 *
 * Captures voice call requests and sends them to a local SMTP server
 * for testing and development purposes. This is useful for testing
 * voice call flows without making actual API calls.
 *
 * @example
 * ```typescript
 * const provider = new VoiceNotificationCatcherProvider('voice')
 *
 * await provider.send({
 *   from: '+1234567890',
 *   to: '+0987654321',
 *   url: 'http://demo.twilio.com/docs/voice.xml'
 * })
 * // Call details sent to localhost:1025 as email
 * ```
 */
export default class VoiceNotificationCatcherProvider extends NotificationCatcherProvider {
  /**
   * Sends voice call request to notification catcher
   *
   * @param request - Voice call request
   * @returns Message ID from SMTP server
   * @throws {ProviderError} If sending to catcher fails
   *
   * @example
   * ```typescript
   * const messageId = await provider.send({
   *   to: '+0987654321',
   *   from: '+1234567890',
   *   url: 'http://example.com/twiml.xml'
   * })
   * ```
   */
  async send(request: VoiceRequest): Promise<string> {
    try {
      // Apply customization if provided
      const customizedRequest = request.customize
        ? await request.customize(this.id, request)
        : request

      const { to, from, url } = customizedRequest

      // Validate required fields
      if (!to || !from || !url) {
        throw new ProviderError(
          'Voice request must include to, from, and url',
          this.id,
          'voice',
          'INVALID_REQUEST'
        )
      }

      // Send to notification catcher via SMTP
      return await this.sendToCatcher({
        to: `${to}@voice`,
        from,
        subject: `${to}@voice`,
        text: url,
        headers: {
          'X-type': 'voice',
          'X-to': `[voice] ${to}`,
        },
      })
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error
      }

      throw new ProviderError(
        `Failed to send to notification catcher: ${error instanceof Error ? error.message : String(error)}`,
        this.id,
        'voice',
        'CATCHER_SEND_FAILED',
        error
      )
    }
  }
}
