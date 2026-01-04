/**
 * GCM/FCM Webpush Provider
 * Sends web push notifications using the web-push library
 *
 * @module providers/webpush/gcm
 * @see https://github.com/web-push-libs/web-push
 */

import webpush from 'web-push'
import { ProviderError } from '../../types/errors'
import type { WebpushRequest } from '../../models/notification-request'

/**
 * GCM provider configuration
 */
export interface GcmConfig {
  gcmAPIKey?: string
  vapidDetails?: {
    subject: string
    publicKey: string
    privateKey: string
  }
  ttl?: number
  headers?: Record<string, string>
}

/**
 * Web-push send notification result
 */
interface WebpushResult {
  statusCode: number
  body: string
  headers?: {
    location?: string
    [key: string]: string | undefined
  }
}

/**
 * GCM/FCM Webpush Provider
 *
 * Implements web push notifications using the web-push library.
 * Supports both GCM API Key (legacy) and VAPID authentication.
 *
 * @example
 * ```typescript
 * // Using VAPID
 * const provider = new WebpushGcmProvider({
 *   vapidDetails: {
 *     subject: 'mailto:admin@example.com',
 *     publicKey: 'BNg...',
 *     privateKey: 'k...'
 *   },
 *   ttl: 3600
 * })
 *
 * // Using GCM API Key (legacy)
 * const gcmProvider = new WebpushGcmProvider({
 *   gcmAPIKey: 'YOUR_GCM_API_KEY'
 * })
 * ```
 */
export default class WebpushGcmProvider {
  readonly id: string = 'webpush-gcm-provider'
  private readonly options: {
    TTL?: number
    headers?: Record<string, string>
  }

  /**
   * Creates a new GCM/FCM webpush provider
   *
   * @param config - GCM configuration
   * @throws {ProviderError} If configuration is invalid
   */
  constructor({ gcmAPIKey, vapidDetails, ttl, headers }: GcmConfig) {
    this.options = { TTL: ttl, headers }

    try {
      if (gcmAPIKey) {
        webpush.setGCMAPIKey(gcmAPIKey)
      }

      if (vapidDetails) {
        const { subject, publicKey, privateKey } = vapidDetails

        if (!subject || !publicKey || !privateKey) {
          throw new ProviderError(
            'VAPID details must include subject, publicKey, and privateKey',
            this.id,
            'webpush',
            'INVALID_VAPID_CONFIG'
          )
        }

        webpush.setVapidDetails(subject, publicKey, privateKey)
      }
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error
      }

      throw new ProviderError(
        `Failed to configure webpush: ${error instanceof Error ? error.message : String(error)}`,
        this.id,
        'webpush',
        'CONFIG_ERROR',
        error
      )
    }
  }

  /**
   * Sends a web push notification
   *
   * @param request - Webpush notification request
   * @returns Location header from the push service
   * @throws {ProviderError} If sending fails
   *
   * @example
   * ```typescript
   * const location = await provider.send({
   *   subscription: {
   *     endpoint: 'https://fcm.googleapis.com/fcm/send/...',
   *     keys: {
   *       auth: 'k...',
   *       p256dh: 'BN...'
   *     }
   *   },
   *   title: 'Hello',
   *   body: 'World',
   *   icon: '/icon.png'
   * })
   * ```
   */
  async send(request: WebpushRequest): Promise<string> {
    try {
      // Apply customization if provided
      const customizedRequest = request.customize
        ? await request.customize(this.id, request)
        : request

      const { subscription, ...rest } = customizedRequest

      // Validate subscription
      if (!subscription?.endpoint || !subscription?.keys?.auth || !subscription?.keys?.p256dh) {
        throw new ProviderError(
          'Webpush request must include valid subscription with endpoint and keys',
          this.id,
          'webpush',
          'INVALID_SUBSCRIPTION'
        )
      }

      // Send notification
      const result = (await webpush.sendNotification(
        subscription,
        JSON.stringify(rest),
        this.options
      )) as WebpushResult

      // Return location header
      if (result.headers?.location && typeof result.headers.location === 'string') {
        return result.headers.location
      }

      // Fallback if no location header
      return `webpush-sent-${Date.now()}`
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error
      }

      // Handle web-push specific errors
      const errorMessage = error instanceof Error ? error.message : String(error)
      const isAuthError = errorMessage.includes('Unauthorized') || errorMessage.includes('401')
      const isGoneError = errorMessage.includes('Gone') || errorMessage.includes('410')

      throw new ProviderError(
        `Failed to send webpush notification: ${errorMessage}`,
        this.id,
        'webpush',
        isAuthError ? 'AUTH_ERROR' : isGoneError ? 'SUBSCRIPTION_EXPIRED' : 'SEND_FAILED',
        error
      )
    }
  }
}
