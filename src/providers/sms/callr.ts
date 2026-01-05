import fetch from '../../util/request'
import { ProviderError } from '../../types/errors'
import type { SmsRequest } from '../../models/notification-request'

/**
 * Configuration options for the CALLR SMS provider
 */
export interface CallrConfig {
  /** CALLR login (username) */
  login: string
  /** CALLR password */
  password: string
  /** Additional configuration options */
  [key: string]: unknown
}

/**
 * CALLR API success response
 */
interface CallrResponse {
  data: string
}

/**
 * CALLR API error response
 */
interface CallrErrorResponse {
  data: Record<string, unknown>
}

/**
 * CALLR SMS Provider
 *
 * Sends SMS messages via the CALLR API.
 *
 * @example
 * ```typescript
 * const provider = new SmsCallrProvider({
 *   login: 'your_login',
 *   password: 'your_password'
 * })
 *
 * await provider.send({
 *   from: 'YourBrand', // Note: 'from' parameter not supported by CALLR API
 *   to: '+33612345678',
 *   text: 'Hello from CALLR!',
 *   type: 'unicode', // 'text' or 'unicode'
 *   nature: 'marketing', // 'marketing' or 'alerting'
 *   id: 'custom-message-id' // optional user data
 * })
 * ```
 *
 * @remarks
 * Supported features:
 * - Basic SMS sending
 * - Type (text/unicode mapped to GSM/UNICODE encoding)
 * - Nature (marketing/transactional mapped to MARKETING/ALERTING)
 * - User data (id or userId)
 *
 * Unsupported features:
 * - from (not used in CALLR API)
 * - messageClass
 * - ttl (time to live)
 *
 * @see https://www.callr.com/docs/api/
 */
export default class SmsCallrProvider {
  readonly id: string = 'sms-callr-provider'
  private readonly apiKey: string

  /**
   * Create a new CALLR SMS provider
   * @param config - Configuration with login and password
   * @throws {ProviderError} If login or password is missing
   */
  constructor({ login, password }: CallrConfig) {
    if (!login || !password) {
      throw new ProviderError('CALLR requires login and password', this.id, 'sms', 'MISSING_CONFIG')
    }
    this.apiKey = Buffer.from(`${login}:${password}`).toString('base64')
  }

  /**
   * Send an SMS message via CALLR
   *
   * @param request - The SMS request details
   * @returns Promise resolving to the CALLR message ID
   * @throws {ProviderError} If the API request fails
   */
  async send(request: SmsRequest): Promise<string> {
    try {
      const { id, userId, from, to, text, type, nature } = request.customize
        ? await request.customize(this.id, request)
        : request

      const response = await fetch('https://api.callr.com/rest/v1.1/sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${this.apiKey}`,
          'User-Agent': 'webventures-comms/v2 (+https://github.com/cryptventure/comms)',
        },
        body: JSON.stringify({
          from,
          to,
          body: text,
          options: {
            force_encoding: type === 'unicode' ? 'UNICODE' : 'GSM',
            nature: nature === 'marketing' ? 'MARKETING' : 'ALERTING',
            ...(userId || id ? { user_data: userId || id } : {}),
          },
        }),
      })

      const responseBody = (await response.json()) as CallrResponse | CallrErrorResponse

      if (response.ok) {
        return (responseBody as CallrResponse).data
      } else {
        const error = (responseBody as CallrErrorResponse).data
        const errorMessage = Object.keys(error)
          .map((key) => `${key}: ${error[key]}`)
          .join(', ')
        throw new ProviderError(errorMessage, this.id, 'sms', String(response.status))
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
