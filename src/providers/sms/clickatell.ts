import fetch from '../../util/request'
import { ProviderError } from '../../types/errors'
import type { SmsRequest } from '../../models/notification-request'

/**
 * Configuration options for the Clickatell SMS provider
 */
export interface ClickatellConfig {
  /** Clickatell API Key (for one-way integration) */
  apiKey: string
  /** Additional configuration options */
  [key: string]: unknown
}

/**
 * Clickatell API message response
 */
interface ClickatellMessage {
  apiMessageId: string
}

/**
 * Clickatell API success response
 */
interface ClickatellResponse {
  messages: ClickatellMessage[]
  error?: string
}

/**
 * Clickatell SMS Provider
 *
 * Sends SMS messages via the Clickatell API using one-way integration.
 *
 * @example
 * ```typescript
 * const provider = new SmsClickatellProvider({
 *   apiKey: 'your_api_key'
 * })
 *
 * await provider.send({
 *   from: '+1234567890', // Note: 'from' not supported for one-way integrations
 *   to: '+0987654321',
 *   text: 'Hello from Clickatell!',
 *   type: 'unicode', // 'text' (UTF-8) or 'unicode' (UCS2-BE)
 *   ttl: 3600, // validity period in seconds
 *   id: 'custom-message-id' // optional client message ID
 * })
 * ```
 *
 * @remarks
 * Supported features:
 * - Basic SMS sending
 * - Type (text/unicode mapped to UTF-8/UCS2-BE charset)
 * - TTL (validityPeriod in seconds)
 * - Client message ID (id field)
 *
 * Unsupported features:
 * - from (not supported for one-way integrations)
 * - nature (marketing/transactional)
 * - messageClass
 *
 * Note: Uses Clickatell's one-way integration API which requires an API key.
 *
 * @see https://docs.clickatell.com/channels/sms-channels/sms-api-reference/
 */
export default class SmsClickatellProvider {
  readonly id: string = 'sms-clickatell-provider'
  private readonly apiKey: string

  /**
   * Create a new Clickatell SMS provider
   * @param config - Configuration with apiKey for one-way integration
   * @throws {ProviderError} If apiKey is missing
   */
  constructor(config: ClickatellConfig) {
    if (!config.apiKey) {
      throw new ProviderError('Clickatell requires apiKey', this.id, 'sms', 'MISSING_CONFIG')
    }
    this.apiKey = config.apiKey
  }

  /**
   * Send an SMS message via Clickatell
   *
   * @param request - The SMS request details
   * @returns Promise resolving to the Clickatell message ID
   * @throws {ProviderError} If the API request fails
   */
  async send(request: SmsRequest): Promise<string> {
    try {
      const { id, to, text, type, ttl } = request.customize
        ? await request.customize(this.id, request)
        : request

      const response = await fetch('https://platform.clickatell.com/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.apiKey,
          'User-Agent': 'webventures-comms/v2 (+https://github.com/cryptventure/comms)',
        },
        body: JSON.stringify({
          // no `from` for one-way integrations
          to: [to],
          content: text,
          charset: type === 'unicode' ? 'UCS2-BE' : 'UTF-8',
          ...(ttl ? { validityPeriod: ttl } : {}),
          ...(id ? { clientMessageId: id } : {}),
        }),
      })

      if (response.ok) {
        const responseBody = (await response.json()) as ClickatellResponse
        if (responseBody.error) {
          throw new ProviderError(responseBody.error, this.id, 'sms')
        } else if (responseBody.messages && responseBody.messages[0]) {
          return responseBody.messages[0].apiMessageId
        } else {
          throw new ProviderError('No message ID in response', this.id, 'sms')
        }
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
