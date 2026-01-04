/**
 * Sender class - handles sending notifications across multiple channels
 * @packageDocumentation
 */

import logger from './util/logger'
import ProviderLogger from './providers/logger'
import Registry from './util/registry'
import type { NotificationRequest, RequestMetadata } from './models/notification-request'
import type { Provider, ChannelType } from './types'
import type { ProviderSendResult, NotificationStatus } from './types/responses'
import { ProviderError } from './types/errors'

/**
 * Providers mapped by channel
 */
export type ProvidersMap = Partial<Record<ChannelType, Provider[]>>

/**
 * Strategies mapped by channel
 */
export type StrategiesMap = Partial<
  Record<ChannelType, (providers: Provider[]) => (request: unknown) => Promise<ProviderSendResult>>
>

/**
 * Sender function type
 */
type SenderFunction = (request: unknown) => Promise<ProviderSendResult>

/**
 * Internal result for a channel send attempt
 */
interface ChannelSendResult {
  success: boolean
  channel: ChannelType
  providerId?: string
  id?: string
  error?: Error
}

/**
 * Sender class - orchestrates notification sending across multiple channels
 *
 * @example
 * ```typescript
 * const sender = new Sender(
 *   ['email', 'sms'],
 *   { email: [emailProvider], sms: [smsProvider] },
 *   { email: fallbackStrategy, sms: roundrobinStrategy }
 * )
 *
 * const result = await sender.send({
 *   email: { from: 'noreply@example.com', to: 'user@example.com', subject: 'Hello', text: 'Hi!' },
 *   sms: { from: '+1234567890', to: '+0987654321', text: 'Hello!' }
 * })
 * ```
 */
export default class Sender {
  private readonly channels: ChannelType[]
  private readonly providers: ProvidersMap
  private readonly strategies: StrategiesMap
  private readonly senders: Partial<Record<ChannelType, SenderFunction>>

  /**
   * Create a new Sender instance
   *
   * @param channels - List of channels to support
   * @param providers - Providers for each channel
   * @param strategies - Strategies for each channel
   */
  constructor(channels: ChannelType[], providers: ProvidersMap, strategies: StrategiesMap) {
    this.channels = channels
    this.providers = providers
    this.strategies = strategies

    // Memoize senders for each channel
    // We can do this because we don't allow adding providers after initialization
    this.senders = Object.keys(strategies).reduce(
      (acc, channelKey) => {
        const channel = channelKey as ChannelType
        const channelProviders = this.providers[channel] || []
        const strategy = this.strategies[channel]

        if (!strategy) {
          return acc
        }

        acc[channel] =
          channelProviders.length > 0
            ? strategy(channelProviders)
            : async (request: unknown): Promise<ProviderSendResult> => {
                logger.warn(`No provider registered for channel "${channel}". Using logger.`)
                const provider = Registry.getInstance<ProviderLogger>(
                  `${channel}-logger-default`,
                  () => new ProviderLogger({}, channel)
                )

                const id = await provider.send(request as never)
                return {
                  providerId: provider.id,
                  id,
                }
              }

        return acc
      },
      {} as Partial<Record<ChannelType, SenderFunction>>
    )
  }

  /**
   * Send a notification across multiple channels
   *
   * @param request - Notification request with channel-specific data
   * @returns Promise resolving to notification status
   */
  async send(request: NotificationRequest): Promise<NotificationStatus> {
    const resultsByChannel = await this.sendOnEachChannel(request)

    const result = resultsByChannel.reduce<NotificationStatus>(
      (acc, { success, channel, providerId, id, error }) => {
        if (success) {
          return {
            ...acc,
            channels: {
              ...(acc.channels || {}),
              [channel]: { id, providerId },
            },
          }
        } else {
          // For errors, we need to extract just the message string
          const errorMessage =
            error instanceof Error ? error.message : String(error || 'Unknown error')
          return {
            ...acc,
            status: 'error',
            errors: {
              ...(acc.errors || {}),
              [channel]: errorMessage,
            },
            channels: {
              ...(acc.channels || {}),
              [channel]: { id: undefined, providerId },
            },
          }
        }
      },
      { status: 'success' }
    )

    return result
  }

  /**
   * Send notification on each channel in parallel
   *
   * @param request - Notification request
   * @returns Promise resolving to array of channel results
   */
  private async sendOnEachChannel(request: NotificationRequest): Promise<ChannelSendResult[]> {
    const requestKeys = Object.keys(request) as string[]

    // Extract metadata properties (id, userId) from the request
    const { id, userId } = request as RequestMetadata

    // Filter to only channel keys
    const channelKeys = requestKeys.filter((key) => {
      return (
        key !== 'id' &&
        key !== 'userId' &&
        key !== 'metadata' &&
        key !== 'customize' &&
        this.channels.includes(key as ChannelType)
      )
    }) as ChannelType[]

    return Promise.all(
      channelKeys.map(async (channel): Promise<ChannelSendResult> => {
        try {
          const sender = this.senders[channel]
          if (!sender) {
            throw new ProviderError(
              `No sender configured for channel: ${channel}`,
              'no-sender',
              channel
            )
          }

          const channelRequest = (request as unknown as Record<string, unknown>)[channel]
          if (!channelRequest) {
            throw new ProviderError(
              `No request data for channel: ${channel}`,
              'no-request-data',
              channel
            )
          }

          // Merge metadata with channel-specific request
          // Channel request comes first, then metadata overwrites with top-level values
          const mergedRequest = {
            ...channelRequest,
            ...(id !== undefined && { id }),
            ...(userId !== undefined && { userId }),
          }

          const result = await sender(mergedRequest)

          return {
            success: true,
            channel,
            ...result,
          }
        } catch (error) {
          const err = error as Error & { providerId?: string }
          return {
            channel,
            success: false,
            error: err,
            providerId: err.providerId,
          }
        }
      })
    )
  }
}
