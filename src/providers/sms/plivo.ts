import fetch from '../../util/request'
import { ProviderError } from '../../types/errors'
import type { SmsRequest } from '../../models/notification-request'

/**
 * Configuration options for the Plivo SMS provider
 */
export interface PlivoConfig {
  /** Plivo Auth ID */
  authId: string
  /** Plivo Auth Token */
  authToken: string
  /** Additional configuration options */
  [key: string]: unknown
}

/**
 * Plivo API response for SMS sending
 */
interface PlivoResponse {
  message_uuid: string[]
}

/**
 * Plivo API error response
 */
interface PlivoErrorResponse {
  error: string
}

/**
 * Plivo SMS Provider
 *
 * Sends SMS messages via the Plivo API.
 *
 * @example
 * ```typescript
 * const provider = new SmsPlivoProvider({
 *   authId: 'MAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
 *   authToken: 'your_auth_token'
 * })
 *
 * await provider.send({
 *   from: '+1234567890',
 *   to: '+0987654321',
 *   text: 'Hello from Plivo!'
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
 * @see https://www.plivo.com/docs/sms/api/message
 */
export default class SmsPlivoProvider {
  readonly id: string = 'sms-plivo-provider'
  private readonly authId: string
  private readonly apiKey: string

  /**
   * Create a new Plivo SMS provider
   * @param config - Configuration with authId and authToken
   */
  constructor({ authId, authToken }: PlivoConfig) {
    this.authId = authId
    this.apiKey = Buffer.from(`${authId}:${authToken}`).toString('base64')
  }

  /**
   * Send an SMS message via Plivo
   *
   * @param request - The SMS request details
   * @returns Promise resolving to the Plivo message UUID
   * @throws {ProviderError} If the API request fails
   */
  async send(request: SmsRequest): Promise<string> {
    try {
      const { from, to, text } = request.customize
        ? await request.customize(this.id, request)
        : request

      const response = await fetch(`https://api.plivo.com/v1/Account/${this.authId}/Message/`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'webventures-comms/v2 (+https://github.com/cryptventure/comms)',
        },
        body: JSON.stringify({
          src: from,
          dst: to,
          text,
        }),
      })

      if (response.ok) {
        const responseBody = (await response.json()) as PlivoResponse
        if (!responseBody.message_uuid || !responseBody.message_uuid[0]) {
          throw new ProviderError('No message UUID in response', this.id, 'sms')
        }
        return responseBody.message_uuid[0]
      } else {
        let errorMessage: string
        if (response.status === 401) {
          errorMessage = await response.text()
        } else {
          const errorBody = (await response.json()) as PlivoErrorResponse
          errorMessage = errorBody.error
        }

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
