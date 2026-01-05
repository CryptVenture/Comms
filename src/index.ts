/**
 * WebVentures Comms SDK - Unified notification SDK for Node.js, Next.js 16+, React 19, React Native, and SSR
 * @packageDocumentation
 */

import NotificationCatcherProvider from './providers/notificationCatcherProvider'
import Sender from './sender'
import dedupe from './util/dedupe'
import logger from './util/logger'
import providerFactory from './providers'
import strategyProvidersFactory from './strategies/providers'
import type { CommsSdkConfig, ChannelConfig, ProviderConfig } from './types/config'
import type { ChannelType } from './types'
import type { NotificationRequest } from './models/notification-request'
import type { NotificationStatus } from './types/responses'

// Re-export types
export type {
  EmailRequest,
  PushRequest,
  SmsRequest,
  VoiceRequest,
  WebpushRequest,
  SlackRequest,
  WhatsappRequest,
  NotificationRequest,
  ChannelRequest,
  RequestMetadata,
} from './models/notification-request'

export type { EmailProvider } from './models/provider-email'
export type { PushProvider } from './models/provider-push'
export type { SmsProvider } from './models/provider-sms'
export type { VoiceProvider } from './models/provider-voice'
export type { WebpushProvider } from './models/provider-webpush'
export type { SlackProvider } from './models/provider-slack'
export type { WhatsappProvider } from './models/provider-whatsapp'

export type { NotificationStatus, SuccessNotificationStatus, ErrorNotificationStatus, ChannelStatus, NotificationStatusType } from './types/responses'

export type {
  ChannelType,
  MultiProviderStrategyType,
  LoggerInstance,
  Provider,
  ProviderFactory,
} from './types'

export type {
  CommsSdkConfig,
  ChannelConfig,
  ProviderConfig,
  CustomProviderConfig,
  EnvironmentConfig,
} from './types/config'

export type { StrategyFunction } from './types/strategies'

export {
  CommsError,
  ProviderError,
  ConfigurationError,
  ValidationError,
  NetworkError,
  isCommsError,
  isProviderError,
} from './types/errors'

export { detectEnvironment } from './types/config'
export { isSuccessResponse, isErrorResponse, getErrors, getChannelIds } from './types/responses'

// Re-export adapters for framework-specific usage
export * from './adapters'

/**
 * Available notification channels
 */
export const CHANNELS = {
  email: 'email',
  push: 'push',
  sms: 'sms',
  voice: 'voice',
  webpush: 'webpush',
  slack: 'slack',
  whatsapp: 'whatsapp',
} as const

/**
 * Main WebVentures Comms SDK class
 *
 * @example
 * ```typescript
 * // Basic usage
 * import CommsSdk from '@webventures/comms'
 *
 * const comms = new CommsSdk({
 *   channels: {
 *     email: {
 *       providers: [{
 *         type: 'sendgrid',
 *         apiKey: process.env.SENDGRID_API_KEY
 *       }]
 *     }
 *   }
 * })
 *
 * const result = await comms.send({
 *   email: {
 *     from: 'noreply@example.com',
 *     to: 'user@example.com',
 *     subject: 'Hello',
 *     text: 'Welcome!'
 *   }
 * })
 * ```
 *
 * @example
 * ```typescript
 * // Multi-provider with fallback strategy
 * const comms = new CommsSdk({
 *   channels: {
 *     email: {
 *       multiProviderStrategy: 'fallback',
 *       providers: [
 *         { type: 'sendgrid', apiKey: 'xxx' },
 *         { type: 'ses', region: 'us-east-1', accessKeyId: 'xxx', secretAccessKey: 'xxx' }
 *       ]
 *     }
 *   }
 * })
 * ```
 *
 * @example
 * ```typescript
 * // Next.js 16+ Server Action
 * import { createNextJSComms } from '@webventures/comms/adapters'
 *
 * export async function sendEmail(email: string) {
 *   'use server'
 *   const comms = createNextJSComms({...})
 *   return await comms.send({...})
 * }
 * ```
 */
export default class CommsSdk {
  /**
   * Internal sender instance
   */
  private sender: Sender

  /**
   * Logger instance (Winston)
   * Can be configured or muted
   */
  public logger: typeof logger = logger

  /**
   * Create a new WebVentures Comms SDK instance
   *
   * @param options - Configuration options
   */
  constructor(options: CommsSdkConfig) {
    const mergedOptions = this.mergeWithDefaultConfig(options)
    const providers = providerFactory(mergedOptions.channels)
    // Filter out undefined channels before passing to strategy factory
    const definedChannels = Object.fromEntries(
      Object.entries(mergedOptions.channels).filter(([_, config]) => config !== undefined)
    ) as Record<string, ChannelConfig<ProviderConfig>>
    const strategies = strategyProvidersFactory(definedChannels)

    const allChannels = dedupe([
      ...Object.keys(CHANNELS),
      ...Object.keys(providers),
    ]) as ChannelType[]

    this.sender = new Sender(allChannels, providers, strategies)
  }

  /**
   * Merge user configuration with defaults
   *
   * @param options - User-provided options
   * @returns Merged configuration
   * @internal This method is exposed for testing purposes
   */
  protected mergeWithDefaultConfig(options: CommsSdkConfig): Required<CommsSdkConfig> {
    const { channels, useNotificationCatcher = false } = options

    // Extract custom channels (non-standard channels provided by user)
    const standardChannels = Object.keys(CHANNELS) as ChannelType[]
    const customChannels = channels
      ? Object.keys(channels).filter(
          (key) => !standardChannels.includes(key as ChannelType) && channels[key] !== undefined
        )
      : []

    // Build custom channel configurations
    const customChannelConfigs = customChannels.reduce(
      (acc, key) => {
        if (channels?.[key]) {
          acc[key] = channels[key]
        }
        return acc
      },
      {} as Record<string, ChannelConfig<ProviderConfig> | undefined>
    )

    return {
      useNotificationCatcher,
      channels: (useNotificationCatcher
        ? NotificationCatcherProvider.getConfig(Object.keys(CHANNELS) as ChannelType[])
        : {
            email: {
              providers: [],
              multiProviderStrategy: 'fallback',
              ...(channels?.email || {}),
            },
            push: {
              providers: [],
              multiProviderStrategy: 'fallback',
              ...(channels?.push || {}),
            },
            sms: {
              providers: [],
              multiProviderStrategy: 'fallback',
              ...(channels?.sms || {}),
            },
            voice: {
              providers: [],
              multiProviderStrategy: 'fallback',
              ...(channels?.voice || {}),
            },
            webpush: {
              providers: [],
              multiProviderStrategy: 'fallback',
              ...(channels?.webpush || {}),
            },
            slack: {
              providers: [],
              multiProviderStrategy: 'fallback',
              ...(channels?.slack || {}),
            },
            whatsapp: {
              providers: [],
              multiProviderStrategy: 'fallback',
              ...(channels?.whatsapp || {}),
            },
            // Include any custom channels
            ...customChannelConfigs,
          }) as Required<CommsSdkConfig>['channels'],
    }
  }

  /**
   * Send a notification
   *
   * @param request - Notification request with channel-specific data
   * @returns Promise resolving to notification status
   *
   * @example
   * ```typescript
   * const result = await comms.send({
   *   email: {
   *     from: 'noreply@example.com',
   *     to: 'user@example.com',
   *     subject: 'Welcome!',
   *     text: 'Thanks for signing up!'
   *   },
   *   sms: {
   *     from: '+1234567890',
   *     to: '+0987654321',
   *     text: 'Welcome to our service!'
   *   }
   * })
   *
   * if (result.status === 'success') {
   *   console.log('Email ID:', result.channels?.email?.id)
   *   console.log('SMS ID:', result.channels?.sms?.id)
   * } else {
   *   console.error('Errors:', result.errors)
   * }
   * ```
   */
  send(request: NotificationRequest): Promise<NotificationStatus> {
    return this.sender.send(request)
  }
}

// Named export for CommonJS compatibility
export { CommsSdk }
