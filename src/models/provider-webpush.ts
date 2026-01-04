/**
 * Web Push notification provider configuration types.
 *
 * Supports browser push notifications using the W3C Push API standard:
 * - GCM/FCM (Google Cloud Messaging / Firebase Cloud Messaging)
 * - Custom providers (implement your own send function)
 * - Logger (for development/testing)
 *
 * Compatible with modern browsers supporting the Push API:
 * Chrome, Firefox, Edge, Safari, Opera, and others.
 *
 * @module provider-webpush
 */

import type { WebpushRequest } from './notification-request'

/**
 * Logger provider for development and testing.
 * Logs web push notification requests without actually sending them.
 */
export interface WebpushProviderLogger {
  type: 'logger'
}

/**
 * Custom web push provider with user-defined send function.
 *
 * @example
 * ```typescript
 * const customProvider: WebpushProviderCustom = {
 *   type: 'custom',
 *   id: 'my-custom-webpush-provider',
 *   send: async (request) => {
 *     // Custom implementation
 *     return 'notification-id-123';
 *   }
 * };
 * ```
 */
export interface WebpushProviderCustom {
  type: 'custom'

  /** Unique identifier for this custom provider */
  id: string

  /**
   * Custom send function implementation.
   *
   * @param request - The web push notification request to send
   * @returns Promise resolving to the notification ID
   */
  send: (request: WebpushRequest) => Promise<string>
}

/**
 * GCM/FCM web push provider configuration.
 *
 * Supports both legacy GCM API key authentication and modern VAPID
 * (Voluntary Application Server Identification) authentication.
 *
 * VAPID is recommended as it:
 * - Works across all push services (not just FCM)
 * - Doesn't require Firebase/GCM setup
 * - Provides better privacy and security
 *
 * @see https://web.dev/push-notifications-overview/
 * @see https://github.com/web-push-libs/web-push
 *
 * @example
 * ```typescript
 * // VAPID authentication (recommended)
 * const webpushProvider: WebpushProviderGcm = {
 *   type: 'gcm',
 *   vapidDetails: {
 *     subject: 'mailto:admin@example.com',
 *     publicKey: 'BEl62iUYg...',
 *     privateKey: 'p6YVD7t...'
 *   },
 *   ttl: 3600
 * };
 *
 * // Legacy GCM API key authentication
 * const legacyProvider: WebpushProviderGcm = {
 *   type: 'gcm',
 *   gcmAPIKey: 'your-gcm-api-key-here'
 * };
 * ```
 */
export interface WebpushProviderGcm {
  type: 'gcm'

  /**
   * Legacy GCM API key.
   *
   * @deprecated Use vapidDetails instead for better cross-browser support
   */
  gcmAPIKey?: string

  /**
   * VAPID authentication details (recommended).
   *
   * Generate VAPID keys using web-push library:
   * ```bash
   * npx web-push generate-vapid-keys
   * ```
   */
  vapidDetails?: {
    /**
     * Subject for VAPID authentication.
     * Should be a mailto: URL or https: URL identifying your application.
     *
     * @example 'mailto:admin@example.com'
     * @example 'https://example.com'
     */
    subject: string

    /**
     * VAPID public key (base64 URL-encoded).
     * Share this with your web application for subscription.
     */
    publicKey: string

    /**
     * VAPID private key (base64 URL-encoded).
     * Keep this secret on your server.
     */
    privateKey: string
  }

  /**
   * Time to live in seconds.
   * How long the push service should attempt to deliver the notification.
   *
   * @default 2419200 (4 weeks)
   */
  ttl?: number

  /**
   * Optional custom HTTP headers for push service requests.
   * May be used for additional metadata or service-specific options.
   */
  headers?: Record<string, string | number | boolean>
}

/**
 * Union type of all web push provider configurations.
 *
 * Use this type when accepting any web push provider configuration.
 *
 * @example
 * ```typescript
 * function setupWebpushProvider(provider: WebpushProvider) {
 *   switch (provider.type) {
 *     case 'gcm':
 *       // Configure GCM/FCM with VAPID
 *       break;
 *     case 'custom':
 *       // Configure custom provider
 *       break;
 *     case 'logger':
 *       // Configure logger
 *       break;
 *   }
 * }
 * ```
 */
export type WebpushProvider = WebpushProviderLogger | WebpushProviderCustom | WebpushProviderGcm

/** @deprecated Use WebpushProvider instead */
export type WebpushProviderType = WebpushProvider
