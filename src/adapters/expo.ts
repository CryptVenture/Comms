/**
 * Expo adapter
 * Provides optimized configuration for Expo applications
 */

import { createReactNativeComms, createCommsBackendClient } from './react-native'

/**
 * Create WebVentures Comms SDK instance optimized for Expo
 * Same caveats as React Native apply - prefer server-side usage
 */
export const createExpoComms = createReactNativeComms

/**
 * Backend API helper for Expo apps
 */
export const createExpoBackendClient = createCommsBackendClient

/**
 * Check if running in Expo
 */
export function isExpo(): boolean {
  return typeof globalThis !== 'undefined' && ('__expo' in globalThis || 'expo' in globalThis)
}

/**
 * Get Expo environment info
 */
export function getExpoInfo(): {
  isExpo: boolean
  isExpoDev: boolean
  platform?: 'ios' | 'android' | 'web'
} {
  const isExpoEnv = isExpo()

  if (!isExpoEnv) {
    return {
      isExpo: false,
      isExpoDev: false,
    }
  }

  // @ts-expect-error - Expo specific
  const Platform = globalThis.Platform
  const platform = Platform?.OS as 'ios' | 'android' | 'web' | undefined

  // Check if in development mode
  const isExpoDev = __DEV__ ?? false

  return {
    isExpo: true,
    isExpoDev,
    platform,
  }
}

declare const __DEV__: boolean | undefined
