import NotificationCatcherProvider from '../notificationCatcherProvider'
import { ProviderError } from '../../types/errors'
import type { SmsRequest } from '../../models/notification-request'

/**
 * SMS Notification Catcher Provider
 *
 * Development/testing provider that captures SMS messages and sends them
 * to a local SMTP server (typically running on port 1025) instead of
 * actually sending them via an SMS gateway.
 *
 * This is useful for:
 * - Local development without spending money on SMS credits
 * - Testing SMS functionality in CI/CD pipelines
 * - Debugging SMS content and formatting
 *
 * @example
 * ```typescript
 * const provider = new SmsNotificationCatcherProvider('sms')
 *
 * await provider.send({
 *   from: '+1234567890',
 *   to: '+0987654321',
 *   text: 'Test message'
 * })
 * // Message will be sent to local SMTP server at localhost:1025
 * // Can be viewed with tools like MailHog or smtp4dev
 * ```
 *
 * @remarks
 * Configuration:
 * - Uses environment variable COMMS_CATCHER_OPTIONS for SMTP config
 * - Defaults to port 1025 with TLS disabled
 * - Messages are formatted as emails with SMS metadata in headers
 *
 * The SMS message is converted to an email format:
 * - To: {phone_number}@sms
 * - From: {sender_number}
 * - Subject: First 20 characters of the message
 * - Body: Full SMS text
 * - Headers: X-type and X-to for identifying SMS messages
 *
 * @see NotificationCatcherProvider for SMTP configuration details
 */
export default class SmsNotificationCatcherProvider extends NotificationCatcherProvider {
  /**
   * Send an SMS message to the notification catcher
   *
   * @param request - The SMS request details
   * @returns Promise resolving to the message ID
   * @throws {ProviderError} If sending to the catcher fails
   */
  async send(request: SmsRequest): Promise<string> {
    try {
      const { to, from, text } = request.customize
        ? await request.customize(this.id, request)
        : request

      return this.sendToCatcher({
        to: `${to}@sms`,
        from,
        subject: `${text.substring(0, 20)}${text.length > 20 ? '...' : ''}`,
        text,
        headers: {
          'X-type': 'sms',
          'X-to': `[sms] ${to}`,
        },
      })
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error
      }
      throw new ProviderError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        this.id,
        'sms',
        undefined,
        error
      )
    }
  }
}
