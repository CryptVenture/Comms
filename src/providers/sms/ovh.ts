import fetch from '../../util/request'
import crypto from 'crypto'
import { ProviderError } from '../../types/errors'
import type { SmsRequest } from '../../models/notification-request'

/**
 * Configuration options for the OVH SMS provider
 */
export interface OvhConfig {
  /** OVH Application Key */
  appKey: string
  /** OVH Application Secret */
  appSecret: string
  /** OVH Consumer Key */
  consumerKey: string
  /** OVH SMS Account name */
  account: string
  /** OVH API host (e.g., 'eu.api.ovh.com') */
  host: string
  /** Additional configuration options */
  [key: string]: unknown
}

/**
 * OVH API credentials
 */
interface OvhCredentials {
  appKey: string
  appSecret: string
  consumerKey: string
  account: string
  host: string
}

/**
 * OVH API response for SMS sending
 */
interface OvhResponse {
  ids: number[]
}

/**
 * OVH API error response
 */
interface OvhErrorResponse {
  message: string
}

/**
 * OVH SMS Provider
 *
 * Sends SMS messages via the OVH API.
 *
 * @example
 * ```typescript
 * const provider = new SmsOvhProvider({
 *   appKey: 'your_app_key',
 *   appSecret: 'your_app_secret',
 *   consumerKey: 'your_consumer_key',
 *   account: 'sms-xx12345-1',
 *   host: 'eu.api.ovh.com'
 * })
 *
 * await provider.send({
 *   from: 'YourBrand',
 *   to: '+33612345678',
 *   text: 'Hello from OVH!',
 *   type: 'transactional',
 *   ttl: 3600, // validity period in seconds
 *   messageClass: 0 // 0 for flash, 1 for phoneDisplay, 2 for sim, 3 for toolkit
 * })
 * ```
 *
 * @remarks
 * Supported features:
 * - Basic SMS sending
 * - Type (transactional/marketing via noStopClause)
 * - TTL (validityPeriod in seconds)
 * - Message class (flash, phoneDisplay, sim, toolkit)
 *
 * To create credentials on OVH.com, follow the tutorial:
 * https://www.ovh.com/fr/g1639.envoyer_des_sms_avec_lapi_ovh_en_php
 *
 * @see https://api.ovh.com/console/#/sms
 */
export default class SmsOvhProvider {
  readonly id: string = 'sms-ovh-provider'
  private readonly credentials: OvhCredentials

  /**
   * Create a new OVH SMS provider
   * @param config - Configuration with OVH API credentials
   */
  constructor({ appKey, appSecret, consumerKey, account, host }: OvhConfig) {
    this.credentials = { appKey, appSecret, consumerKey, account, host }
  }

  /**
   * Sign an OVH API request
   * @param httpMethod - HTTP method (e.g., 'POST')
   * @param url - Full URL of the request
   * @param body - Request body as string
   * @param timestamp - Unix timestamp in seconds
   * @returns Signed signature for the request
   */
  private signRequest(httpMethod: string, url: string, body: string, timestamp: number): string {
    const { appSecret, consumerKey } = this.credentials
    const signature = [appSecret, consumerKey, httpMethod, url, body, timestamp]
    return '$1$' + crypto.createHash('sha1').update(signature.join('+')).digest('hex')
  }

  /**
   * Send an SMS message via OVH
   *
   * @param request - The SMS request details
   * @returns Promise resolving to the OVH message ID
   * @throws {ProviderError} If the API request fails
   */
  async send(request: SmsRequest): Promise<string> {
    try {
      const { appKey, consumerKey, account, host } = this.credentials
      const timestamp = Math.round(Date.now() / 1000)

      const { from, to, text, nature, ttl, messageClass } = request.customize
        ? await request.customize(this.id, request)
        : request

      // Map messageClass to OVH class names
      let classType: string | null = null
      if (messageClass === 0) classType = 'flash'
      else if (messageClass === 1) classType = 'phoneDisplay'
      else if (messageClass === 2) classType = 'sim'
      else if (messageClass === 3) classType = 'toolkit'

      const body = JSON.stringify({
        sender: from,
        message: text,
        receivers: [to],
        charset: 'UTF-8',
        class: classType,
        noStopClause: nature === 'transactional',
        validityPeriod: ttl,
      })

      // Escape unicode characters for signature calculation
      const reqBody = body.replace(/[\u0080-\uFFFF]/g, (m) => {
        return '\\u' + ('0000' + m.charCodeAt(0).toString(16)).slice(-4)
      })

      const url = `https://${host}/1.0/sms/${account}/jobs/`

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-Ovh-Timestamp': String(timestamp),
          'X-Ovh-Signature': this.signRequest('POST', url, reqBody, timestamp),
          'X-Ovh-Consumer': consumerKey,
          'X-Ovh-Application': appKey,
          'Content-Length': String(reqBody.length),
          'Content-Type': 'application/json charset=utf-8',
          'User-Agent': 'webventures-comms/v2 (+https://github.com/cryptventure/comms)',
        },
        body,
      })

      const responseBody = (await response.json()) as OvhResponse | OvhErrorResponse

      if (response.ok) {
        const successResponse = responseBody as OvhResponse
        if (!successResponse.ids || !successResponse.ids[0]) {
          throw new ProviderError('No message ID in response', this.id, 'sms')
        }
        return String(successResponse.ids[0])
      } else {
        throw new ProviderError(
          `${response.status} - ${(responseBody as OvhErrorResponse).message}`,
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
