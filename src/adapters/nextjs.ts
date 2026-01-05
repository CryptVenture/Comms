/**
 * Next.js 16+ adapter
 * Provides SSR-safe configuration and utilities for Next.js applications
 */

import type { CommsSdkConfig } from '../types/config'
import { ConfigurationError } from '../types/errors'
import { CommsSdk } from '../index'

/**
 * Create WebVentures Comms SDK instance optimized for Next.js
 * Safe for use in Server Components, API Routes, and Server Actions
 *
 * @throws {ConfigurationError} If called from client-side (browser) code
 *
 * @example
 * // In Server Component or Server Action
 * import { createNextJSComms } from '@webventures/comms/adapters'
 *
 * export async function sendWelcomeEmail(email: string) {
 *   'use server'
 *   const comms = createNextJSComms({
 *     channels: {
 *       email: {
 *         providers: [{type: 'sendgrid', apiKey: process.env.SENDGRID_API_KEY!}]
 *       }
 *     }
 *   })
 *   return await comms.send({email: {from: 'noreply@example.com', to: email, subject: 'Welcome!', text: 'Hello!'}})
 * }
 */
export function createNextJSComms(config: CommsSdkConfig): CommsSdk {
  // Verify we're in a server environment
  if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
    throw new ConfigurationError(
      'WebVentures Comms SDK must only be used in server-side Next.js code (Server Components, API Routes, or Server Actions)',
      'NEXTJS_SERVER_ONLY'
    )
  }

  return new CommsSdk(config)
}

/**
 * Type-safe Server Action wrapper for sending notifications
 *
 * @example
 * import { withComms } from '@webventures/comms/adapters'
 *
 * export const sendEmail = withComms(async (comms, email: string) => {
 *   return await comms.send({
 *     email: {from: 'noreply@example.com', to: email, subject: 'Hello', text: 'Hi!'}
 *   })
 * }, {
 *   channels: {
 *     email: {providers: [{type: 'sendgrid', apiKey: process.env.SENDGRID_API_KEY!}]}
 *   }
 * })
 */
export function withComms<TArgs extends unknown[], TReturn>(
  handler: (comms: CommsSdk, ...args: TArgs) => Promise<TReturn>,
  config: CommsSdkConfig
): (...args: TArgs) => Promise<TReturn> {
  let sdkInstance: CommsSdk | null = null

  return async (...args: TArgs): Promise<TReturn> => {
    // Lazy initialization - create SDK instance on first call
    if (!sdkInstance) {
      sdkInstance = createNextJSComms(config)
    }

    return handler(sdkInstance, ...args)
  }
}

/**
 * Check if running in Next.js environment
 */
export function isNextJS(): boolean {
  return (
    typeof process !== 'undefined' &&
    process.env !== undefined &&
    '__NEXT_PROCESSED_ENV' in process.env
  )
}

/**
 * Check if running in Next.js Edge Runtime
 */
export function isNextJSEdge(): boolean {
  return typeof globalThis !== 'undefined' && 'EdgeRuntime' in globalThis
}
