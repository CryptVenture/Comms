import fetch from '../../util/request'
import { ProviderError } from '../../types/errors'
import type { SmsRequest } from '../../models/notification-request'

/**
 * Configuration options for the Seven (seven.io) SMS provider
 */
export interface SevenConfig {
  /** Seven.io API Key */
  apiKey: string
  /** Additional configuration options */
  [key: string]: unknown
}

/**
 * Seven API message response
 */
interface SevenMessage {
  id: string
}

/**
 * Seven API success response
 */
interface SevenResponse {
  messages: SevenMessage[]
}

/**
 * Seven (seven.io) SMS Provider
 *
 * Sends SMS messages via the Seven.io API (formerly sms77.io).
 *
 * @example
 * ```typescript
 * const provider = new SmsSevenProvider({
 *   apiKey: 'your_api_key'
 * })
 *
 * await provider.send({
 *   from: 'YourBrand',
 *   to: '+491234567890',
 *   text: 'Hello from Seven!',
 *   type: 'unicode', // 'text' or 'unicode'
 *   ttl: 86400, // TTL in seconds
 *   messageClass: 0 // 0 for flash SMS, others for standard
 * })
 * ```
 *
 * @remarks
 * Supported features:
 * - Basic SMS sending
 * - Type (text/unicode)
 * - TTL (time to live in seconds)
 * - Message class (flash SMS when messageClass is 0)
 *
 * Unsupported features:
 * - nature (marketing/transactional)
 *
 * @see https://www.seven.io/en/docs/gateway/http-api/
 */
export default class SmsSevenProvider {
  readonly id: string = 'sms-seven-provider'
  private readonly apiKey: string

  /**
   * Create a new Seven SMS provider
   * @param config - Configuration with apiKey
   */
  constructor({ apiKey }: SevenConfig) {
    this.apiKey = apiKey
  }

  /**
   * Send an SMS message via Seven
   *
   * @param request - The SMS request details
   * @returns Promise resolving to the Seven message ID
   * @throws {ProviderError} If the API request fails
   */
  async send(request: SmsRequest): Promise<string> {
    try {
      const { from, text, to, type, ttl, messageClass } = request.customize
        ? await request.customize(this.id, request)
        : request

      const params = {
        flash: messageClass === 0 ? 1 : 0,
        from,
        text,
        to,
        ttl,
        unicode: type === 'unicode' ? 1 : 0,
      }

      const response = await fetch('https://gateway.seven.io/api/sms', {
        body: JSON.stringify(params),
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          SentWith: 'WebVentures',
          'User-Agent': 'webventures-comms/v2 (+https://github.com/cryptventure/comms)',
          'X-Api-Key': this.apiKey,
        },
        method: 'POST',
      })

      if (response.ok) {
        const { messages } = (await response.json()) as SevenResponse
        if (!messages || !messages[0]) {
          throw new ProviderError('No message in response', this.id, 'sms')
        }
        const message = messages[0]
        return message.id
      } else {
        const errorText = await response.text()
        throw new ProviderError(errorText, this.id, 'sms', String(response.status))
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
