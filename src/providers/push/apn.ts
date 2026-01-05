import PushNotifications from 'node-pushnotifications'
import { ConfigurationError, ProviderError } from '../../types/errors'
import type { PushRequest } from '../../models/notification-request'

/**
 * APN (Apple Push Notification) Provider
 *
 * Sends push notifications to iOS devices via Apple Push Notification service.
 *
 * @example
 * ```typescript
 * // Using token-based authentication (recommended)
 * const provider = new PushApnProvider({
 *   token: {
 *     key: './AuthKey_ABC123.p8',
 *     keyId: 'ABC123',
 *     teamId: 'DEF456'
 *   },
 *   production: true
 * })
 *
 * // Using certificate-based authentication
 * const provider = new PushApnProvider({
 *   cert: './cert.pem',
 *   key: './key.pem',
 *   production: true
 * })
 *
 * await provider.send({
 *   registrationToken: 'device-token',
 *   title: 'Hello',
 *   body: 'World',
 *   priority: 'high',
 *   badge: 1,
 *   sound: 'default',
 *   topic: 'com.example.app'
 * })
 * ```
 *
 * @see https://developer.apple.com/documentation/usernotifications
 */
export default class PushApnProvider {
  /**
   * Unique identifier for this provider
   */
  readonly id: string = 'push-apn-provider'

  /**
   * node-pushnotifications transporter instance
   */
  private readonly transporter: PushNotifications

  /**
   * Creates a new APN push notification provider
   *
   * @param config - APN configuration
   * @throws {ConfigurationError} If configuration is invalid
   */
  constructor(config: ApnConfig) {
    if (!config) {
      throw new ConfigurationError('APN provider requires configuration', 'APN_CONFIG_MISSING')
    }

    // Validate authentication method
    const hasToken = config.token && config.token.key && config.token.keyId && config.token.teamId
    const hasCert = config.cert && config.key
    const hasPfx = config.pfx

    if (!hasToken && !hasCert && !hasPfx) {
      throw new ConfigurationError(
        'APN provider requires either token authentication (key, keyId, teamId), ' +
          'certificate authentication (cert, key), or pfx file',
        'APN_AUTH_MISSING'
      )
    }

    // Convert ca from array format to string if needed
    const apnConfig = { ...config } as Record<string, unknown>
    if (config.ca && Array.isArray(config.ca)) {
      // node-pushnotifications expects ca as string, not array
      // Extract filename from first entry if available
      apnConfig.ca = config.ca[0]?.filename
    }

    this.transporter = new PushNotifications({
      apn: apnConfig,
    })
  }

  /**
   * Sends a push notification via APN
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
   *   sound: 'notification.aiff',
   *   topic: 'com.example.app',
   *   category: 'MESSAGE_CATEGORY',
   *   mutableContent: 1,
   *   expiry: 3600
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
        throw new ProviderError('No response received from APN', this.id, 'push', 'NO_RESPONSE')
      }

      const firstResult = resultArray[0]
      if (!firstResult) {
        throw new ProviderError('Empty result received from APN', this.id, 'push', 'EMPTY_RESULT')
      }

      if (firstResult.failure > 0) {
        // Extract error message from the first failed message
        const errorMessage =
          firstResult.message && firstResult.message[0]
            ? firstResult.message[0].error || 'Unknown APN error'
            : 'Unknown APN error'

        throw new ProviderError(
          `APN notification failed: ${errorMessage}`,
          this.id,
          'push',
          'APN_SEND_FAILED',
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
        `Failed to send APN notification: ${error instanceof Error ? error.message : String(error)}`,
        this.id,
        'push',
        'SEND_ERROR',
        error
      )
    }
  }
}

/**
 * APN provider configuration
 */
export interface ApnConfig {
  /**
   * Token-based authentication (recommended)
   * @see https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server/establishing_a_token-based_connection_to_apns
   */
  token?: {
    /**
     * Path to .p8 key file or the key content as string
     */
    key: string

    /**
     * 10-character Key ID from Apple Developer portal
     */
    keyId: string

    /**
     * 10-character Team ID from Apple Developer portal
     */
    teamId: string
  }

  /**
   * Certificate-based authentication (legacy)
   * Path to .pem cert file or the cert content as string
   */
  cert?: string

  /**
   * Certificate-based authentication (legacy)
   * Path to .pem key file or the key content as string
   */
  key?: string

  /**
   * CA certificates to trust when validating APN server certificate
   */
  ca?: Array<{ filename: string }>

  /**
   * Path to .pfx or .p12 file or the content as Buffer
   */
  pfx?: string | Buffer

  /**
   * Passphrase for the certificate or pfx
   */
  passphrase?: string

  /**
   * Whether to use production APNs server
   * @default false (uses sandbox/development server)
   */
  production?: boolean

  /**
   * Whether to reject unauthorized SSL certificates
   * @default true
   */
  rejectUnauthorized?: boolean

  /**
   * Number of connection retries
   * @default 10
   */
  connectionRetryLimit?: number
}
