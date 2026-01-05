import PushNotifications from 'node-pushnotifications'
import { ConfigurationError, ProviderError } from '../../types/errors'
import type { PushRequest } from '../../models/notification-request'

/**
 * FCM (Firebase Cloud Messaging) Push Notification Provider
 *
 * Sends push notifications to Android and iOS devices via Firebase Cloud Messaging.
 *
 * @example
 * ```typescript
 * const provider = new PushFcmProvider({
 *   id: 'your-server-key',
 *   phonegap: false
 * })
 *
 * await provider.send({
 *   registrationToken: 'device-token',
 *   title: 'Hello',
 *   body: 'World',
 *   priority: 'high',
 *   badge: 1,
 *   sound: 'default'
 * })
 * ```
 *
 * @see https://firebase.google.com/docs/cloud-messaging
 */
export default class PushFcmProvider {
  /**
   * Unique identifier for this provider
   */
  readonly id: string = 'push-fcm-provider'

  /**
   * node-pushnotifications transporter instance
   */
  private readonly transporter: PushNotifications

  /**
   * Creates a new FCM push notification provider
   *
   * @param config - FCM configuration
   * @param config.id - Server key from Firebase Console (legacy) or service account key
   * @param config.phonegap - Whether to use phonegap mode (defaults to false)
   *
   * @throws {ConfigurationError} If configuration is invalid
   */
  constructor(config: FcmConfig) {
    if (!config) {
      throw new ConfigurationError('FCM provider requires configuration', 'FCM_CONFIG_MISSING')
    }

    if (!config.id) {
      throw new ConfigurationError(
        'FCM provider requires an id (server key) in configuration',
        'FCM_SERVER_KEY_MISSING'
      )
    }

    this.transporter = new PushNotifications({
      gcm: config,
    })
  }

  /**
   * Sends a push notification via FCM
   *
   * @param request - Push notification request
   * @returns Promise resolving to the message ID
   * @throws {ProviderError} If the notification fails to send
   *
   * @example
   * ```typescript
   * const messageId = await provider.send({
   *   registrationToken: 'device-token',
   *   title: 'New Message',
   *   body: 'You have a new message',
   *   custom: { userId: '123' },
   *   priority: 'high',
   *   badge: 5,
   *   sound: 'notification.mp3',
   *   icon: 'ic_notification',
   *   color: '#FF0000',
   *   clickAction: 'FLUTTER_NOTIFICATION_CLICK'
   * })
   * ```
   */
  async send(request: PushRequest): Promise<string> {
    try {
      // Apply customization if provided
      const customizedRequest = request.customize
        ? await request.customize(this.id, request)
        : request

      const { registrationToken, ...rest } = customizedRequest

      // Validate registration token
      if (!registrationToken) {
        throw new ProviderError(
          'Missing registrationToken in push notification request',
          this.id,
          'push',
          'MISSING_REGISTRATION_TOKEN'
        )
      }

      // Send notification using node-pushnotifications v4 API
      const result = await this.transporter.send([registrationToken], rest)

      // Check for failures in the response
      const resultArray = Array.isArray(result) ? result : [result]
      if (!resultArray || resultArray.length === 0) {
        throw new ProviderError('No response received from FCM', this.id, 'push', 'NO_RESPONSE')
      }

      const firstResult = resultArray[0]
      if (!firstResult) {
        throw new ProviderError('Empty result received from FCM', this.id, 'push', 'EMPTY_RESULT')
      }

      if (firstResult.failure > 0) {
        // Extract error message from the first failed message
        const errorMessage =
          firstResult.message && firstResult.message[0]
            ? firstResult.message[0].error || 'Unknown FCM error'
            : 'Unknown FCM error'

        throw new ProviderError(
          `FCM notification failed: ${errorMessage}`,
          this.id,
          'push',
          'FCM_SEND_FAILED',
          errorMessage
        )
      }

      // Extract message ID from successful response
      if (
        firstResult.message &&
        firstResult.message[0] &&
        (firstResult.message[0] as { messageId?: string }).messageId
      ) {
        return (firstResult.message[0] as unknown as { messageId: string }).messageId
      }

      // Fallback: if no messageId but success, return success indicator
      return 'success'
    } catch (error) {
      // Re-throw if already a ProviderError
      if (error instanceof ProviderError) {
        throw error
      }

      // Wrap other errors in ProviderError
      throw new ProviderError(
        `Failed to send FCM notification: ${error instanceof Error ? error.message : String(error)}`,
        this.id,
        'push',
        'SEND_ERROR',
        error
      )
    }
  }
}

/**
 * FCM provider configuration
 */
export interface FcmConfig {
  /**
   * Server key from Firebase Console (legacy) or service account key
   * @see https://console.firebase.google.com/
   */
  id: string

  /**
   * Whether to use phonegap mode
   * @default false
   */
  phonegap?: boolean
}
