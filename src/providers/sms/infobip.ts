import fetch from '../../util/request'
import { ProviderError } from '../../types/errors'
import type { SmsRequest } from '../../models/notification-request'

/**
 * Configuration options for the Infobip SMS provider
 */
export interface InfobipConfig {
  /** Infobip username */
  username: string
  /** Infobip password */
  password: string
  /** Additional configuration options */
  [key: string]: unknown
}

/**
 * Infobip API message status
 */
interface InfobipMessageStatus {
  groupId: number
  groupName?: string
  id?: number
  name?: string
  description?: string
  [key: string]: unknown
}

/**
 * Infobip API message response
 */
interface InfobipMessage {
  messageId: string
  status: InfobipMessageStatus
}

/**
 * Infobip API success response
 */
interface InfobipResponse {
  messages: InfobipMessage[]
}

/**
 * Infobip API error response
 */
interface InfobipErrorResponse {
  requestError?: {
    serviceException?: Record<string, unknown>
  }
  [key: string]: unknown
}

/**
 * Infobip SMS Provider
 *
 * Sends SMS messages via the Infobip API.
 *
 * @example
 * ```typescript
 * const provider = new SmsInfobipProvider({
 *   username: 'your_username',
 *   password: 'your_password'
 * })
 *
 * await provider.send({
 *   from: 'YourBrand',
 *   to: '41793026727',
 *   text: 'Hello from Infobip!'
 * })
 * ```
 *
 * @remarks
 * Supported features:
 * - Basic SMS sending
 *
 * Unsupported features:
 * - nature (marketing/transactional)
 * - messageClass
 * - type (text/unicode)
 * - ttl (time to live)
 *
 * The Infobip API returns detailed status information.
 * Status groupId 1 indicates success.
 *
 * @see https://www.infobip.com/docs/api#channels/sms
 */
export default class SmsInfobipProvider {
  readonly id: string = 'sms-infobip-provider'
  private readonly apiKey: string

  /**
   * Create a new Infobip SMS provider
   * @param config - Configuration with username and password
   */
  constructor({ username, password }: InfobipConfig) {
    this.apiKey = Buffer.from(`${username}:${password}`).toString('base64')
  }

  /**
   * Send an SMS message via Infobip
   *
   * @param request - The SMS request details
   * @returns Promise resolving to the Infobip message ID
   * @throws {ProviderError} If the API request fails
   */
  async send(request: SmsRequest): Promise<string> {
    try {
      const { from, to, text } = request.customize
        ? await request.customize(this.id, request)
        : request

      const response = await fetch('https://api.infobip.com/sms/1/text/single', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${this.apiKey}`,
          'User-Agent': 'webventures-comms/v2 (+https://github.com/cryptventure/comms)',
        },
        body: JSON.stringify({
          from,
          to,
          text,
        }),
      })

      const responseBody = (await response.json()) as InfobipResponse | InfobipErrorResponse

      if (response.ok) {
        const successResponse = responseBody as InfobipResponse
        if (!successResponse.messages || !successResponse.messages[0]) {
          throw new ProviderError('No message in response', this.id, 'sms')
        }
        const message = successResponse.messages[0]
        if (message.status.groupId === 1) {
          return message.messageId
        } else {
          const error = message.status
          const errorMessage = Object.keys(error)
            .map((key) => `${key}: ${String(error[key])}`)
            .join(', ')
          throw new ProviderError(errorMessage, this.id, 'sms', String(error.id || error.groupId))
        }
      } else {
        const errorResponse = responseBody as InfobipErrorResponse
        if (errorResponse.requestError?.serviceException) {
          const error = errorResponse.requestError.serviceException
          const errorMessage = Object.keys(error)
            .map((key) => `${key}: ${error[key]}`)
            .join(', ')
          throw new ProviderError(errorMessage, this.id, 'sms', String(response.status))
        } else {
          throw new ProviderError(
            JSON.stringify(responseBody),
            this.id,
            'sms',
            String(response.status)
          )
        }
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
