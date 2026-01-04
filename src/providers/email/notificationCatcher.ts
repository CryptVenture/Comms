import NotificationCatcherProvider from '../notificationCatcherProvider'
import type { EmailRequest } from '../../models/notification-request'

/**
 * Email Notification Catcher Provider
 *
 * A development/testing provider that captures email notifications and sends them
 * to a local SMTP server (notification-catcher) instead of real recipients.
 *
 * This provider is useful for:
 * - Development and testing environments
 * - Preventing accidental email sends to real users
 * - Viewing emails in a web interface (http://localhost:1080)
 *
 * @example
 * ```typescript
 * // Create provider (uses default notification-catcher settings)
 * const provider = new EmailNotificationCatcherProvider('email')
 *
 * // Send email (will be caught by notification-catcher)
 * const messageId = await provider.send({
 *   from: 'sender@example.com',
 *   to: 'recipient@example.com',
 *   subject: 'Test Email',
 *   text: 'This email will be caught',
 *   html: '<p>This email will be caught</p>'
 * })
 *
 * // View the email at http://localhost:1080
 * ```
 *
 * @see https://www.npmjs.com/package/notification-catcher
 */
export default class EmailNotificationCatcherProvider extends NotificationCatcherProvider {
  /**
   * Send an email to the notification catcher
   *
   * @param request - Email request details
   * @returns A promise that resolves to the message ID
   * @throws {ProviderError} If sending fails
   */
  async send(request: EmailRequest): Promise<string> {
    // Apply customization if provided
    const { to, from, html, text, subject, replyTo, attachments } = request.customize
      ? await request.customize(this.id, request)
      : request

    // Send to the notification catcher with special headers
    return this.sendToCatcher({
      to,
      from,
      html,
      text,
      subject,
      replyTo,
      attachments,
      headers: {
        'X-to': `[email] ${to}`,
      },
    })
  }
}
