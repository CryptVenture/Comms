import SmsLoggerProvider from '../logger'
import Sms46elksProvider from './46elks'
import SmsCallrProvider from './callr'
import SmsClickatellProvider from './clickatell'
import SmsInfobipProvider from './infobip'
import SmsNexmoProvider from './nexmo'
import SmsNotificationCatcherProvider from './notificationCatcher'
import SmsOvhProvider from './ovh'
import SmsPlivoProvider from './plivo'
import SmsTwilioProvider from './twilio'
import SmsSevenProvider from './seven'
import type { SmsRequest } from '../../models/notification-request'

/**
 * SMS Provider interface that all SMS providers must implement
 */
export interface SmsProviderType {
  /** Unique identifier for the provider */
  id: string

  /**
   * Send an SMS message
   * @param request - The SMS request details
   * @returns Promise resolving to the message ID from the provider
   */
  send(request: SmsRequest): Promise<string>
}

/**
 * Configuration options for creating an SMS provider
 */
export interface SmsProviderConfig {
  /** The type of SMS provider to create */
  type: string
  /** Additional provider-specific configuration */
  [key: string]: unknown
}

/**
 * Factory function to create an SMS provider instance based on the type
 *
 * @param config - Configuration object with type and provider-specific options
 * @returns An instance of the requested SMS provider
 * @throws {Error} If the provider type is unknown
 *
 * @example
 * ```typescript
 * // Create a Twilio provider
 * const provider = factory({
 *   type: 'twilio',
 *   accountSid: 'ACxxx',
 *   authToken: 'xxx'
 * })
 *
 * // Create a logger provider for development
 * const loggerProvider = factory({
 *   type: 'logger'
 * })
 * ```
 */
export default function factory({ type, ...config }: SmsProviderConfig): SmsProviderType {
  switch (type) {
    // Development
    case 'logger':
      return new SmsLoggerProvider(config, 'sms')

    case 'notificationcatcher':
      return new SmsNotificationCatcherProvider('sms')

    // Custom
    case 'custom':
      return config as unknown as SmsProviderType

    // Providers
    case '46elks':
      return new Sms46elksProvider(config as never)

    case 'callr':
      return new SmsCallrProvider(config as never)

    case 'clickatell':
      return new SmsClickatellProvider(config as never)

    case 'infobip':
      return new SmsInfobipProvider(config as never)

    case 'nexmo':
      return new SmsNexmoProvider(config as never)

    case 'ovh':
      return new SmsOvhProvider(config as never)

    case 'plivo':
      return new SmsPlivoProvider(config as never)

    case 'twilio':
      return new SmsTwilioProvider(config as never)

    case 'seven':
      return new SmsSevenProvider(config as never)

    default:
      throw new Error(`Unknown sms provider "${type}".`)
  }
}
