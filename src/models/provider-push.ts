/**
 * Push notification provider configuration types.
 *
 * Supports multiple mobile push notification platforms:
 * - APNs (Apple Push Notification service) for iOS
 * - FCM (Firebase Cloud Messaging) for Android and iOS
 * - WNS (Windows Push Notification Service) for Windows
 * - ADM (Amazon Device Messaging) for Amazon Fire devices
 * - Custom providers (implement your own send function)
 * - Logger (for development/testing)
 *
 * @module provider-push
 */

import type { PushRequest } from './notification-request'

/**
 * Logger provider for development and testing.
 * Logs push notification requests without actually sending them.
 */
export interface PushProviderLogger {
  type: 'logger'
}

/**
 * Custom push notification provider with user-defined send function.
 *
 * @example
 * ```typescript
 * const customProvider: PushProviderCustom = {
 *   type: 'custom',
 *   id: 'my-custom-push-provider',
 *   send: async (request) => {
 *     // Custom implementation
 *     return 'message-id-123';
 *   }
 * };
 * ```
 */
export interface PushProviderCustom {
  type: 'custom'

  /** Unique identifier for this custom provider */
  id: string

  /**
   * Custom send function implementation.
   *
   * @param request - The push notification request to send
   * @returns Promise resolving to the message ID
   */
  send: (request: PushRequest) => Promise<string>
}

/**
 * Apple Push Notification service (APNs) provider configuration.
 *
 * Supports both token-based authentication (recommended) and certificate-based authentication.
 *
 * @see https://github.com/node-apn/node-apn/blob/master/doc/provider.markdown
 * @see https://developer.apple.com/documentation/usernotifications
 *
 * @example
 * ```typescript
 * // Token-based authentication (recommended)
 * const apnsProvider: PushProviderApn = {
 *   type: 'apn',
 *   token: {
 *     key: 'path/to/AuthKey_KEYID.p8',
 *     keyId: 'KEYID123',
 *     teamId: 'TEAMID123'
 *   },
 *   production: true
 * };
 *
 * // Certificate-based authentication
 * const apnsProviderCert: PushProviderApn = {
 *   type: 'apn',
 *   cert: 'path/to/cert.pem',
 *   key: 'path/to/key.pem',
 *   production: true
 * };
 * ```
 */
export interface PushProviderApn {
  type: 'apn'

  /**
   * Token-based authentication configuration (recommended).
   * Uses a .p8 key file from Apple Developer account.
   */
  token?: {
    /** Path to .p8 key file or key content as string */
    key: string

    /** 10-character Key ID from Apple Developer account */
    keyId: string

    /** 10-character Team ID from Apple Developer account */
    teamId: string
  }

  /**
   * Certificate for certificate-based authentication.
   * Path to .pem certificate file or certificate content as string.
   */
  cert?: string

  /**
   * Private key for certificate-based authentication.
   * Path to .pem key file or key content as string.
   */
  key?: string

  /**
   * Certificate authority certificates.
   * Array of CA certificate file paths.
   */
  ca?: Array<{ filename: string }>

  /**
   * PKCS#12 certificate data.
   * Path to .p12 file or file content as Buffer.
   */
  pfx?: string

  /** Passphrase for encrypted certificates/keys */
  passphrase?: string

  /**
   * Use production APNs servers.
   * - true: api.push.apple.com (production)
   * - false: api.sandbox.push.apple.com (development)
   */
  production?: boolean

  /** Reject unauthorized TLS certificates (set to false for development only) */
  rejectUnauthorized?: boolean

  /** Maximum number of connection retry attempts */
  connectionRetryLimit?: number
}

/**
 * Firebase Cloud Messaging (FCM) provider configuration.
 *
 * FCM is the successor to Google Cloud Messaging (GCM) and supports
 * both Android and iOS devices.
 *
 * @see https://firebase.google.com/docs/cloud-messaging
 * @see https://github.com/ToothlessGear/node-gcm
 *
 * @example
 * ```typescript
 * const fcmProvider: PushProviderFcm = {
 *   type: 'fcm',
 *   id: 'your-server-key-here',
 *   phonegap: false
 * };
 * ```
 */
export interface PushProviderFcm {
  type: 'fcm'

  /**
   * FCM server key (legacy) or service account credentials.
   * Obtain from Firebase Console.
   */
  id: string

  /**
   * Enable PhoneGap/Cordova compatibility mode.
   * Sets data payload format for PhoneGap push plugin.
   */
  phonegap?: boolean
}

/**
 * Windows Push Notification Service (WNS) provider configuration.
 *
 * Used for sending push notifications to Windows devices.
 *
 * @see https://docs.microsoft.com/en-us/windows/uwp/design/shell/tiles-and-notifications/windows-push-notification-services--wns--overview
 * @see https://github.com/tjanczuk/wns
 *
 * @example
 * ```typescript
 * const wnsProvider: PushProviderWns = {
 *   type: 'wns',
 *   clientId: 'your-package-sid',
 *   clientSecret: 'your-client-secret',
 *   notificationMethod: 'sendTileSquareBlock'
 * };
 * ```
 */
export interface PushProviderWns {
  type: 'wns'

  /**
   * Package SID from Windows Dev Center.
   * Also called Application ID.
   */
  clientId: string

  /** Client secret from Windows Dev Center */
  clientSecret: string

  /**
   * WNS notification method name.
   *
   * Examples:
   * - Tile: sendTileSquareBlock, sendTileSquareImage, sendTileWideBlockAndText01
   * - Toast: sendToastText01, sendToastText02, sendToastImageAndText01
   * - Badge: sendBadge
   * - Raw: sendRaw
   *
   * @see https://github.com/tjanczuk/wns#sender-api
   */
  notificationMethod: string
}

/**
 * Amazon Device Messaging (ADM) provider configuration.
 *
 * Used for sending push notifications to Amazon Fire devices.
 *
 * @see https://developer.amazon.com/docs/adm/overview.html
 * @see https://github.com/umano/node-adm
 *
 * @example
 * ```typescript
 * const admProvider: PushProviderAdm = {
 *   type: 'adm',
 *   clientId: 'your-client-id',
 *   clientSecret: 'your-client-secret'
 * };
 * ```
 */
export interface PushProviderAdm {
  type: 'adm'

  /** ADM client ID from Amazon Developer Console */
  clientId: string

  /** ADM client secret from Amazon Developer Console */
  clientSecret: string
}

/**
 * Union type of all push notification provider configurations.
 *
 * Use this type when accepting any push notification provider configuration.
 *
 * @example
 * ```typescript
 * function setupPushProvider(provider: PushProvider) {
 *   switch (provider.type) {
 *     case 'apn':
 *       // Configure APNs
 *       break;
 *     case 'fcm':
 *       // Configure FCM
 *       break;
 *     case 'wns':
 *       // Configure WNS
 *       break;
 *     case 'adm':
 *       // Configure ADM
 *       break;
 *     // ... handle other providers
 *   }
 * }
 * ```
 */
export type PushProvider =
  | PushProviderLogger
  | PushProviderCustom
  | PushProviderApn
  | PushProviderFcm
  | PushProviderWns
  | PushProviderAdm

/** @deprecated Use PushProvider instead */
export type PushProviderType = PushProvider
