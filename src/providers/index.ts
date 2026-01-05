/**
 * Provider Registry
 * Main factory for creating channel-specific notification providers
 *
 * @module providers
 */

import emailFactory from './email'
import pushFactory from './push'
import smsFactory from './sms'
import voiceFactory from './voice'
import webpushFactory from './webpush'
import slackFactory from './slack'
import whatsappFactory from './whatsapp'
import telegramFactory from './telegram'
import { ProviderError } from '../types/errors'
import type { ChannelType } from '../types'
import type {
  EmailRequest,
  PushRequest,
  SmsRequest,
  VoiceRequest,
  WebpushRequest,
  SlackRequest,
  WhatsappRequest,
  TelegramRequest,
} from '../models/notification-request'

/**
 * Generic request type (union of all channel request types)
 */
export type RequestType =
  | EmailRequest
  | PushRequest
  | SmsRequest
  | VoiceRequest
  | WebpushRequest
  | SlackRequest
  | WhatsappRequest
  | TelegramRequest

/**
 * Channel configuration with providers
 */
export interface ChannelConfig {
  providers: Array<Record<string, unknown>>
}

/**
 * Channel options type mapping channel types to their configurations
 */
export type ChannelOptionsType = {
  [K in ChannelType]?: ChannelConfig
}

/**
 * Base provider interface
 */
export interface Provider<TRequest = RequestType> {
  id: string
  send(request: TRequest): Promise<string>
}

/**
 * Providers type mapping channel types to provider arrays
 */
export type ProvidersType = {
  [K in ChannelType]?: Provider[]
}

/**
 * Provider factory function
 * Creates channel-specific providers based on configuration
 *
 * @param channels - Channel configurations
 * @returns Mapping of channel types to provider instances
 * @throws {ProviderError} If provider creation fails
 *
 * @example
 * ```typescript
 * const providers = factory({
 *   email: {
 *     providers: [
 *       { type: 'smtp', host: 'smtp.gmail.com', port: 587 }
 *     ]
 *   },
 *   sms: {
 *     providers: [
 *       { type: 'twilio', accountSid: '...', authToken: '...' }
 *     ]
 *   },
 *   push: {
 *     providers: [
 *       { type: 'fcm', serviceAccount: {...} }
 *     ]
 *   }
 * })
 * ```
 */
export default function factory(channels: ChannelOptionsType): ProvidersType {
  try {
    return (Object.keys(channels) as ChannelType[]).reduce<ProvidersType>(
      (acc, key: ChannelType): ProvidersType => {
        const channelConfig = channels[key]
        if (!channelConfig) {
          return acc
        }

        try {
          acc[key] = channelConfig.providers.map((config) => {
            switch (key) {
              case 'email':
                return emailFactory(config as never)

              case 'sms':
                return smsFactory(config as never)

              case 'voice':
                return voiceFactory(config as never)

              case 'push':
                return pushFactory(config as never)

              case 'webpush':
                return webpushFactory(config as never)

              case 'slack':
                return slackFactory(config as never)

              case 'whatsapp':
                return whatsappFactory(config as never)

              case 'telegram':
                return telegramFactory(config as never)

              default:
                // For custom channels, return the config as-is if it implements Provider
                if (config && typeof config === 'object' && 'id' in config && 'send' in config) {
                  return config as unknown as Provider<RequestType>
                }
                throw new ProviderError(
                  `Unknown channel type "${key}" or invalid custom provider`,
                  'provider-factory',
                  key,
                  'UNKNOWN_CHANNEL'
                )
            }
          })
        } catch (error) {
          if (error instanceof ProviderError) {
            throw error
          }
          throw new ProviderError(
            `Failed to create providers for channel "${key}": ${error instanceof Error ? error.message : String(error)}`,
            'provider-factory',
            key,
            'CHANNEL_SETUP_FAILED',
            error
          )
        }

        return acc
      },
      {}
    )
  } catch (error) {
    if (error instanceof ProviderError) {
      throw error
    }
    throw new ProviderError(
      `Failed to create provider registry: ${error instanceof Error ? error.message : String(error)}`,
      'provider-factory',
      undefined,
      'FACTORY_FAILED',
      error
    )
  }
}
