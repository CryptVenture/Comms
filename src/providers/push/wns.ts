import PushNotifications from 'node-pushnotifications'
import { ConfigurationError, ProviderError } from '../../types/errors'
import type { PushRequest } from '../../models/notification-request'

/**
 * WNS (Windows Push Notification Service) Provider
 *
 * Sends push notifications to Windows devices via Windows Push Notification Service.
 *
 * @example
 * ```typescript
 * const provider = new PushWnsProvider({
 *   clientId: 'your-client-id',
 *   clientSecret: 'your-client-secret',
 *   notificationMethod: 'sendTileSquareBlock'
 * })
 *
 * await provider.send({
 *   registrationToken: 'channel-uri',
 *   title: 'Hello',
 *   body: 'World',
 *   launch: 'app-defined-string',
 *   duration: 'long'
 * })
 * ```
 *
 * @see https://docs.microsoft.com/en-us/windows/apps/design/shell/tiles-and-notifications/windows-push-notification-services--wns--overview
 */
export default class PushWnsProvider {
  /**
   * Unique identifier for this provider
   */
  readonly id: string = 'push-wns-provider'

  /**
   * node-pushnotifications transporter instance
   */
  private readonly transporter: PushNotifications

  /**
   * Creates a new WNS push notification provider
   *
   * @param config - WNS configuration
   * @param config.clientId - Client ID from Microsoft Store Dashboard
   * @param config.clientSecret - Client Secret from Microsoft Store Dashboard
   * @param config.notificationMethod - WNS notification method (e.g., 'sendTileSquareBlock', 'sendToastText01')
   *
   * @throws {ConfigurationError} If configuration is invalid
   */
  constructor(config: WnsConfig) {
    if (!config) {
      throw new ConfigurationError('WNS provider requires configuration', 'WNS_CONFIG_MISSING')
    }

    if (!config.clientId || !config.clientSecret) {
      throw new ConfigurationError(
        'WNS provider requires clientId and clientSecret in configuration',
        'WNS_CREDENTIALS_MISSING'
      )
    }

    if (!config.notificationMethod) {
      throw new ConfigurationError(
        'WNS provider requires notificationMethod in configuration',
        'WNS_METHOD_MISSING'
      )
    }

    this.transporter = new PushNotifications({
      wns: {
        ...config,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      },
    })
  }

  /**
   * Sends a push notification via WNS
   *
   * @param request - Push notification request
   * @returns Promise resolving to the message ID
   * @throws {ProviderError} If the notification fails to send
   *
   * @example
   * ```typescript
   * const messageId = await provider.send({
   *   registrationToken: 'https://...',
   *   title: 'New Message',
   *   body: 'You have a new message',
   *   custom: { userId: '123' },
   *   launch: 'action=viewMessage&messageId=123',
   *   duration: 'long',
   *   headers: {
   *     'X-WNS-Tag': 'message-tag'
   *   }
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

      // Validate registration token (channel URI)
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
        throw new ProviderError('No response received from WNS', this.id, 'push', 'NO_RESPONSE')
      }

      const firstResult = resultArray[0]
      if (!firstResult) {
        throw new ProviderError('Empty result received from WNS', this.id, 'push', 'EMPTY_RESULT')
      }

      if (firstResult.failure > 0) {
        // Extract error message from the first failed message
        const errorMessage =
          firstResult.message && firstResult.message[0]
            ? firstResult.message[0].error || 'Unknown WNS error'
            : 'Unknown WNS error'

        throw new ProviderError(
          `WNS notification failed: ${errorMessage}`,
          this.id,
          'push',
          'WNS_SEND_FAILED',
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
        `Failed to send WNS notification: ${error instanceof Error ? error.message : String(error)}`,
        this.id,
        'push',
        'SEND_ERROR',
        error
      )
    }
  }
}

/**
 * WNS provider configuration
 */
export interface WnsConfig {
  /**
   * Client ID from Microsoft Store Dashboard
   * @see https://partner.microsoft.com/dashboard
   */
  clientId: string

  /**
   * Client Secret from Microsoft Store Dashboard
   */
  clientSecret: string

  /**
   * WNS notification method to use
   *
   * Toast notifications:
   * - sendToastText01, sendToastText02, sendToastText03, sendToastText04
   * - sendToastImageAndText01, sendToastImageAndText02, sendToastImageAndText03, sendToastImageAndText04
   *
   * Tile notifications:
   * - sendTileSquareBlock, sendTileSquareText01, sendTileSquareText02, sendTileSquareText03, sendTileSquareText04
   * - sendTileSquareImage, sendTileSquarePeekImageAndText01, sendTileSquarePeekImageAndText02
   * - sendTileSquarePeekImageAndText03, sendTileSquarePeekImageAndText04
   * - sendTileWideText01, sendTileWideText02, sendTileWideText03, sendTileWideText04
   * - sendTileWideText05, sendTileWideText06, sendTileWideText07, sendTileWideText08
   * - sendTileWideText09, sendTileWideText10, sendTileWideText11
   * - sendTileWideImage, sendTileWideImageCollection
   * - sendTileWideImageAndText01, sendTileWideImageAndText02
   * - sendTileWideBlockAndText01, sendTileWideBlockAndText02
   * - sendTileWideSmallImageAndText01, sendTileWideSmallImageAndText02
   * - sendTileWideSmallImageAndText03, sendTileWideSmallImageAndText04
   * - sendTileWideSmallImageAndText05
   * - sendTileWidePeekImageCollection01, sendTileWidePeekImageCollection02
   * - sendTileWidePeekImageCollection03, sendTileWidePeekImageCollection04
   * - sendTileWidePeekImageCollection05, sendTileWidePeekImageCollection06
   * - sendTileWidePeekImageAndText01, sendTileWidePeekImageAndText02
   * - sendTileWidePeekImage01, sendTileWidePeekImage02, sendTileWidePeekImage03
   * - sendTileWidePeekImage04, sendTileWidePeekImage05, sendTileWidePeekImage06
   *
   * Badge notifications:
   * - sendBadge
   *
   * Raw notifications:
   * - sendRaw
   *
   * @see https://docs.microsoft.com/en-us/previous-versions/windows/apps/hh761494(v=win.10)
   */
  notificationMethod: string

  /**
   * Access token expiration time in seconds
   * @default 1800 (30 minutes)
   */
  accessTokenExpiry?: number
}
