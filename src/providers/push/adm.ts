import PushNotifications from 'node-pushnotifications'
import { ProviderError } from '../../types/errors'
import type { PushRequest } from '../../models/notification-request'

/**
 * ADM (Amazon Device Messaging) Provider
 *
 * Sends push notifications to Amazon devices (Kindle Fire, Fire TV) via Amazon Device Messaging.
 *
 * @example
 * ```typescript
 * const provider = new PushAdmProvider({
 *   clientId: 'your-client-id',
 *   clientSecret: 'your-client-secret'
 * })
 *
 * await provider.send({
 *   registrationToken: 'device-registration-id',
 *   title: 'Hello',
 *   body: 'World',
 *   consolidationKey: 'message-group',
 *   expiresAfter: 604800
 * })
 * ```
 *
 * @see https://developer.amazon.com/docs/adm/overview.html
 */
export default class PushAdmProvider {
  /**
   * Unique identifier for this provider
   */
  readonly id: string = 'push-adm-provider'

  /**
   * node-pushnotifications transporter instance
   */
  private readonly transporter: PushNotifications

  /**
   * Creates a new ADM push notification provider
   *
   * @param config - ADM configuration
   * @param config.clientId - Client ID from Amazon Developer Console
   * @param config.clientSecret - Client Secret from Amazon Developer Console
   *
   * @throws {Error} If configuration is invalid
   */
  constructor(config: AdmConfig) {
    if (!config) {
      throw new Error('ADM provider requires configuration')
    }

    if (!config.clientId || !config.clientSecret) {
      throw new Error('ADM provider requires clientId and clientSecret in configuration')
    }

    this.transporter = new PushNotifications({
      adm: {
        ...config,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      },
    })
  }

  /**
   * Sends a push notification via ADM
   *
   * @param request - Push notification request
   * @returns Promise resolving to the message ID
   * @throws {ProviderError} If the notification fails to send
   *
   * @example
   * ```typescript
   * const messageId = await provider.send({
   *   registrationToken: 'amzn1.adm-registration...',
   *   title: 'New Message',
   *   body: 'You have a new message',
   *   custom: { userId: '123', action: 'view' },
   *   consolidationKey: 'messages',
   *   expiresAfter: 604800, // 7 days in seconds
   *   sound: 'default'
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
        throw new ProviderError('No response received from ADM', this.id, 'push', 'NO_RESPONSE')
      }

      const firstResult = resultArray[0]
      if (!firstResult) {
        throw new ProviderError('Empty result received from ADM', this.id, 'push', 'EMPTY_RESULT')
      }

      if (firstResult.failure > 0) {
        // Extract error message from the first failed message
        const errorMessage =
          firstResult.message && firstResult.message[0]
            ? firstResult.message[0].error || 'Unknown ADM error'
            : 'Unknown ADM error'

        throw new ProviderError(
          `ADM notification failed: ${errorMessage}`,
          this.id,
          'push',
          'ADM_SEND_FAILED',
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
        `Failed to send ADM notification: ${error instanceof Error ? error.message : String(error)}`,
        this.id,
        'push',
        'SEND_ERROR',
        error
      )
    }
  }
}

/**
 * ADM provider configuration
 */
export interface AdmConfig {
  /**
   * Client ID from Amazon Developer Console
   * @see https://developer.amazon.com/settings/console/registration/new
   */
  clientId: string

  /**
   * Client Secret from Amazon Developer Console
   */
  clientSecret: string

  /**
   * Access token expiration time in seconds
   * @default 3600 (1 hour)
   */
  accessTokenExpiry?: number
}
