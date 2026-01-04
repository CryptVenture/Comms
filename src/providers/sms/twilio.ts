import fetch from '../../util/request'
import FormData from 'form-data'
import { ProviderError } from '../../types/errors'
import type { SmsRequest } from '../../models/notification-request'

/**
 * Configuration options for the Twilio SMS provider
 */
export interface TwilioConfig {
  /** Twilio Account SID */
  accountSid: string
  /** Twilio Auth Token */
  authToken: string
  /** Additional configuration options */
  [key: string]: unknown
}

/**
 * Twilio SMS Provider
 *
 * Sends SMS messages via the Twilio API.
 *
 * @example
 * ```typescript
 * const provider = new SmsTwilioProvider({
 *   accountSid: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
 *   authToken: 'your_auth_token'
 * })
 *
 * await provider.send({
 *   from: '+1234567890',
 *   to: '+0987654321',
 *   text: 'Hello from Twilio!',
 *   ttl: 3600 // optional validity period in seconds
 * })
 * ```
 *
 * @remarks
 * Supported features:
 * - Basic SMS sending
 * - TTL (ValidityPeriod)
 *
 * Unsupported features:
 * - type (text/unicode)
 * - nature (marketing/transactional)
 * - messageClass
 *
 * @see https://www.twilio.com/docs/sms/api
 */
export default class SmsTwilioProvider {
  readonly id: string = 'sms-twilio-provider'
  private readonly accountSid: string
  private readonly apiKey: string

  /**
   * Create a new Twilio SMS provider
   * @param config - Configuration with accountSid and authToken
   */
  constructor({ accountSid, authToken }: TwilioConfig) {
    this.accountSid = accountSid
    this.apiKey = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
  }

  /**
   * Send an SMS message via Twilio
   *
   * @param request - The SMS request details
   * @returns Promise resolving to the Twilio message SID
   * @throws {ProviderError} If the API request fails
   */
  async send(request: SmsRequest): Promise<string> {
    try {
      const { from, to, text, ttl } = request.customize
        ? await request.customize(this.id, request)
        : request

      const form = new FormData()
      form.append('From', from)
      form.append('To', to)
      form.append('Body', text)
      if (ttl) {
        form.append('ValidityPeriod', ttl.toString())
      }

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${this.apiKey}`,
            'User-Agent': 'webventures-comms/v2 (+https://github.com/cryptventure/comms)',
          },
          // @ts-expect-error - form-data FormData is compatible with fetch at runtime
          body: form,
        }
      )

      const responseBody = (await response.json()) as { sid: string; message?: string }

      if (response.ok) {
        return responseBody.sid
      } else {
        throw new ProviderError(
          `${response.status} - ${responseBody.message}`,
          this.id,
          'sms',
          String(response.status)
        )
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
