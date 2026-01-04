import fetch from '../../util/request'
import qs from 'querystring'
import { ProviderError } from '../../types/errors'
import type { SmsRequest } from '../../models/notification-request'

/**
 * Configuration options for the 46elks SMS provider
 */
export interface Elks46Config {
  /** 46elks API Username */
  apiUsername: string
  /** 46elks API Password */
  apiPassword: string
  /** Additional configuration options */
  [key: string]: unknown
}

/**
 * 46elks API success response
 */
interface Elks46Response {
  id: string
}

/**
 * 46elks SMS Provider
 *
 * Sends SMS messages via the 46elks API (Swedish SMS provider).
 *
 * @example
 * ```typescript
 * const provider = new Sms46elksProvider({
 *   apiUsername: 'uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
 *   apiPassword: 'your_api_password'
 * })
 *
 * await provider.send({
 *   from: 'YourBrand',
 *   to: '+46701234567',
 *   text: 'Hello from 46elks!'
 * })
 * ```
 *
 * @remarks
 * Supported features:
 * - Basic SMS sending
 *
 * Unsupported features:
 * - type (text/unicode)
 * - nature (marketing/transactional)
 * - ttl (time to live)
 * - messageClass
 *
 * The API uses form-encoded data for requests.
 *
 * @see https://46elks.com/docs/send-sms
 */
export default class Sms46elksProvider {
  readonly id: string = 'sms-46elks-provider'
  private readonly apiKey: string

  /**
   * Create a new 46elks SMS provider
   * @param config - Configuration with apiUsername and apiPassword
   */
  constructor({ apiUsername, apiPassword }: Elks46Config) {
    this.apiKey = Buffer.from(`${apiUsername}:${apiPassword}`).toString('base64')
  }

  /**
   * Send an SMS message via 46elks
   *
   * @param request - The SMS request details
   * @returns Promise resolving to the 46elks message ID
   * @throws {ProviderError} If the API request fails
   */
  async send(request: SmsRequest): Promise<string> {
    try {
      const { from, to, text } = request.customize
        ? await request.customize(this.id, request)
        : request

      const response = await fetch('https://api.46elks.com/a1/sms', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${this.apiKey}`,
          'User-Agent': 'webventures-comms/v2 (+https://github.com/cryptventure/comms)',
        },
        body: qs.stringify({
          from,
          to,
          message: text,
        }),
      })

      if (response.ok) {
        const responseBody = (await response.json()) as Elks46Response
        return responseBody.id
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
