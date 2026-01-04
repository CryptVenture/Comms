/**
 * Response types for WebVentures Comms SDK
 */

import type { ChannelType } from './index'

/**
 * Status for a single channel send
 */
export interface ChannelStatus {
  /**
   * Notification ID returned by the provider
   */
  id: string | undefined

  /**
   * Provider ID that was used
   */
  providerId: string | undefined
}

/**
 * Overall notification status
 */
export type NotificationStatusType = 'success' | 'error'

/**
 * Complete notification response
 */
export interface NotificationStatus {
  /**
   * Overall status: 'success' if all channels succeeded, 'error' if any failed
   */
  status: NotificationStatusType

  /**
   * Results for successfully sent channels
   */
  channels?: Partial<Record<ChannelType, ChannelStatus>>

  /**
   * Errors for failed channels
   */
  errors?: Partial<Record<ChannelType, Error>>
}

/**
 * Discriminated type for successful notification responses.
 * Narrows NotificationStatus to indicate a successful result with the channels field always present.
 */
export interface SuccessNotificationStatus {
  /**
   * Status is always 'success' for successful responses
   */
  status: 'success'

  /**
   * Results for successfully sent channels (always present on success)
   */
  channels: Partial<Record<ChannelType, ChannelStatus>>

  /**
   * Errors are not present on successful responses
   */
  errors?: undefined
}

/**
 * Discriminated type for error notification responses.
 * Narrows NotificationStatus to indicate a failed result with the errors field always present.
 */
export interface ErrorNotificationStatus {
  /**
   * Status is always 'error' for error responses
   */
  status: 'error'

  /**
   * Channels are not present on error responses
   */
  channels?: undefined

  /**
   * Errors for failed channels (always present on error)
   */
  errors: Partial<Record<ChannelType, Error>>
}

/**
 * Provider send result
 */
export interface ProviderSendResult {
  /**
   * Notification ID from provider
   */
  id: string

  /**
   * Provider ID that was used
   */
  providerId: string
}

/**
 * Type guard for successful response.
 * Returns a type predicate that narrows NotificationStatus to SuccessNotificationStatus.
 */
export function isSuccessResponse(status: NotificationStatus): status is SuccessNotificationStatus {
  return status.status === 'success'
}

/**
 * Type guard for error response
 */
export function isErrorResponse(status: NotificationStatus): boolean {
  return status.status === 'error'
}

/**
 * Extract errors from response
 */
export function getErrors(status: NotificationStatus): Error[] {
  if (!status.errors) return []
  return Object.values(status.errors).filter((err): err is Error => err instanceof Error)
}

/**
 * Extract channel IDs from response
 */
export function getChannelIds(status: NotificationStatus): Partial<Record<ChannelType, string>> {
  const ids: Partial<Record<ChannelType, string>> = {}
  if (!status.channels) return ids

  for (const [channel, channelStatus] of Object.entries(status.channels)) {
    if (channelStatus?.id) {
      ids[channel as ChannelType] = channelStatus.id
    }
  }

  return ids
}
