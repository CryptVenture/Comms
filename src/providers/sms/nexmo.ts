import fetch from '../../util/request'
import { ProviderError } from '../../types/errors'
import type { SmsRequest } from '../../models/notification-request'

/**
 * Configuration options for the Nexmo (Vonage) SMS provider
 */
export interface NexmoConfig {
  /** Nexmo API Key */
  apiKey: string
  /** Nexmo API Secret */
  apiSecret: string
  /** Additional configuration options */
  [key: string]: unknown
}

/**
 * Credentials object for Nexmo API requests
 */
interface NexmoCredentials {
  api_key: string
  api_secret: string
}

/**
 * Nexmo API response for SMS sending
 */
interface NexmoResponse {
  messages: Array<{
    status: string
    'message-id': string
    'error-text'?: string
  }>
}

/**
 * Nexmo (Vonage) SMS Provider
 *
 * Sends SMS messages via the Nexmo/Vonage API.
 *
 * @example
 * ```typescript
 * const provider = new SmsNexmoProvider({
 *   apiKey: 'your_api_key',
 *   apiSecret: 'your_api_secret'
 * })
 *
 * await provider.send({
 *   from: 'YourBrand',
 *   to: '447700900000',
 *   text: 'Hello from Nexmo!',
 *   type: 'text', // or 'unicode'
 *   ttl: 86400000, // optional TTL in milliseconds
 *   messageClass: 0 // optional: 0 for flash SMS
 * })
 * ```
 *
 * @remarks
 * Supported features:
 * - Basic SMS sending
 * - Type (text/unicode)
 * - TTL (time to live)
 * - Message class
 *
 * Unsupported features:
 * - nature (marketing/transactional)
 *
 * Note: Nexmo API always returns HTTP 200, even for errors.
 * Check the status field in the response to determine success.
 *
 * @see https://developer.vonage.com/api/sms
 */
export default class SmsNexmoProvider {
  readonly id: string = 'sms-nexmo-provider'
  private readonly credentials: NexmoCredentials

  /**
   * Create a new Nexmo SMS provider
   * @param config - Configuration with apiKey and apiSecret
   */
  constructor(config: NexmoConfig) {
    this.credentials = { api_key: config.apiKey, api_secret: config.apiSecret }
  }

  /**
   * Send an SMS message via Nexmo
   *
   * @param request - The SMS request details
   * @returns Promise resolving to the Nexmo message ID
   * @throws {ProviderError} If the API request fails
   */
  async send(request: SmsRequest): Promise<string> {
    try {
      const { from, to, text, type, ttl, messageClass } = request.customize
        ? await request.customize(this.id, request)
        : request

      const response = await fetch('https://rest.nexmo.com/sms/json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'webventures-comms/v2 (+https://github.com/cryptventure/comms)',
        },
        body: JSON.stringify({
          ...this.credentials,
          from,
          to,
          text,
          type,
          ttl,
          'message-class': messageClass,
        }),
      })

      if (response.ok) {
        const responseBody = (await response.json()) as NexmoResponse
        if (!responseBody.messages || !responseBody.messages[0]) {
          throw new ProviderError('No message in response', this.id, 'sms')
        }
        const message = responseBody.messages[0]

        // Nexmo always returns 200 even for errors
        if (message.status !== '0') {
          throw new ProviderError(
            `status: ${message.status}, error: ${message['error-text'] || 'Unknown error'}`,
            this.id,
            'sms',
            message.status
          )
        } else {
          return message['message-id']
        }
      } else {
        throw new ProviderError(`HTTP ${response.status}`, this.id, 'sms', String(response.status))
      }
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error
      }
      throw new ProviderError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        this.id,
        'sms',
        undefined,
        error
      )
    }
  }
}
