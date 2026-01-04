import NotificationCatcherProvider from '../notificationCatcherProvider'
import type { PushRequest } from '../../models/notification-request'

/**
 * Push Notification Catcher Provider
 *
 * Development provider that captures push notifications and sends them to a local
 * email server (like MailCatcher or MailHog) for testing purposes.
 *
 * This is useful during development to test push notification logic without
 * sending actual notifications to devices.
 *
 * @example
 * ```typescript
 * // Set up environment variable (optional)
 * process.env.COMMS_CATCHER_OPTIONS = JSON.stringify({
 *   port: 1025,
 *   ignoreTLS: true
 * })
 *
 * const provider = new PushNotificationCatcherProvider('push')
 *
 * await provider.send({
 *   registrationToken: 'test-device-token',
 *   title: 'Test Notification',
 *   body: 'This is a test message',
 *   custom: { userId: '123' }
 * })
 * ```
 *
 * @see https://mailcatcher.me/
 * @see https://github.com/mailhog/MailHog
 */
export default class PushNotificationCatcherProvider extends NotificationCatcherProvider {
  /**
   * Sends a push notification to the notification catcher
   *
   * The notification is converted to an email format and sent to a local SMTP server
   * for inspection during development.
   *
   * @param request - Push notification request
   * @returns Promise resolving to the message ID
   *
   * @example
   * ```typescript
   * const messageId = await provider.send({
   *   registrationToken: 'device-token-abc123',
   *   title: 'New Message',
   *   body: 'You have received a new message',
   *   custom: {
   *     userId: '123',
   *     messageId: '456',
   *     action: 'view'
   *   },
   *   badge: 5,
   *   sound: 'notification.mp3',
   *   priority: 'high'
   * })
   * ```
   */
  async send(request: PushRequest): Promise<string> {
    // Apply customization if provided
    const customizedRequest = request.customize
      ? await request.customize(this.id, request)
      : request

    const { registrationToken, title, ...rest } = customizedRequest

    // Truncate title for subject line
    const truncatedTitle = title
      ? `${title.substring(0, 20)}${title.length > 20 ? '...' : ''}`
      : 'Push Notification'

    // Truncate registration token for display
    const truncatedToken = registrationToken
      ? `${registrationToken.substring(0, 20)}...`
      : 'unknown'

    // Send notification as email to catcher
    return this.sendToCatcher({
      to: 'user@push.me',
      from: '-',
      subject: truncatedTitle,
      headers: {
        'X-type': 'push',
        'X-to': `[push] ${truncatedToken}`,
        'X-payload': JSON.stringify({ title, ...rest }),
      },
    })
  }
}
