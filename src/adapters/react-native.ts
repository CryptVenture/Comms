/**
 * React Native adapter
 * Provides optimized configuration for React Native applications
 */

import type { CommsSdkConfig } from '../types/config'
import { NetworkError } from '../types/errors'
import { CommsSdk } from '../index'

/**
 * Create WebVentures Comms SDK instance optimized for React Native
 *
 * Note: Most notification providers require server-side API keys and should
 * not be called directly from React Native apps. Instead, create a backend
 * API that uses WebVentures Comms SDK server-side.
 *
 * This adapter is useful for development/testing or when using custom providers
 * that support client-side usage.
 *
 * @example
 * import { createReactNativeComms } from '@webventures/comms/adapters'
 *
 * const comms = createReactNativeComms({
 *   channels: {
 *     slack: {
 *       providers: [{type: 'webhook', webhookUrl: 'https://...'}]
 *     }
 *   }
 * })
 */
export function createReactNativeComms(config: CommsSdkConfig): CommsSdk {
  if (!isReactNative()) {
    console.warn('createReactNativeComms called outside React Native environment')
  }

  return new CommsSdk(config)
}

/**
 * Check if running in React Native
 */
export function isReactNative(): boolean {
  return (
    typeof globalThis.navigator !== 'undefined' &&
    'product' in globalThis.navigator &&
    (globalThis.navigator as typeof globalThis.navigator & { product?: string }).product ===
      'ReactNative'
  )
}

/**
 * Get React Native platform (iOS, Android)
 */
export function getReactNativePlatform(): 'ios' | 'android' | 'unknown' {
  if (!isReactNative()) return 'unknown'

  // @ts-expect-error - React Native specific
  const Platform = globalThis.Platform
  if (Platform && Platform.OS) {
    return Platform.OS as 'ios' | 'android'
  }

  return 'unknown'
}

/**
 * Backend API helper for React Native apps
 * Use this to call your backend API that uses WebVentures Comms SDK server-side
 *
 * @example
 * import { createCommsBackendClient } from '@webventures/comms/adapters'
 *
 * const client = createCommsBackendClient('https://api.example.com')
 *
 * await client.send({
 *   email: {from: 'noreply@example.com', to: 'user@example.com', subject: 'Hello', text: 'Hi!'}
 * })
 */
export function createCommsBackendClient(baseUrl: string) {
  return {
    async send(notification: unknown) {
      const response = await globalThis.fetch(`${baseUrl}/notifications/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notification),
      })

      if (!response.ok) {
        throw new NetworkError(
          `Failed to send notification: ${response.statusText}`,
          response.status
        )
      }

      return response.json()
    },
  }
}
