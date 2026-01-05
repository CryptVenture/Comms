/**
 * Twilio Voice Provider
 * Sends voice calls via Twilio API
 *
 * @module providers/voice/twilio
 * @see https://www.twilio.com/docs/voice/api
 */

import fetch from '../../util/request'
import FormData from 'form-data'
import { ProviderError } from '../../types/errors'
import type { VoiceRequest } from '../../models/notification-request'

/**
 * Twilio provider configuration
 */
export interface TwilioConfig {
  accountSid: string
  authToken: string
}

/**
 * Twilio API response
 */
interface TwilioResponse {
  sid: string
  status?: number
  message?: string
}

/**
 * Twilio Voice Provider
 * Implements voice call functionality using Twilio's API
 *
 * @example
 * ```typescript
 * const provider = new VoiceTwilioProvider({
 *   accountSid: 'AC...',
 *   authToken: '...'
 * })
 *
 * await provider.send({
 *   from: '+1234567890',
 *   to: '+0987654321',
 *   url: 'http://demo.twilio.com/docs/voice.xml'
 * })
 * ```
 */
export default class VoiceTwilioProvider {
  readonly id: string = 'voice-twilio-provider'
  private readonly accountSid: string
  private readonly apiKey: string

  /**
   * Creates a new Twilio voice provider
   *
   * @param config - Twilio configuration
   * @throws {ProviderError} If accountSid or authToken is missing
   */
  constructor({ accountSid, authToken }: TwilioConfig) {
    if (!accountSid || !authToken) {
      throw new ProviderError(
        'Twilio requires accountSid and authToken',
        this.id,
        'voice',
        'MISSING_CONFIG'
      )
    }

    this.accountSid = accountSid
    this.apiKey = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
  }

  /**
   * Sends a voice call via Twilio
   *
   * @param request - Voice call request
   * @returns Call SID from Twilio
   * @throws {ProviderError} If the API request fails
   *
   * @example
   * ```typescript
   * const sid = await provider.send({
   *   from: '+1234567890',
   *   to: '+0987654321',
   *   url: 'http://demo.twilio.com/docs/voice.xml',
   *   method: 'GET',
   *   statusCallback: 'https://example.com/callback',
   *   timeout: 60
   * })
   * ```
   */
  async send(request: VoiceRequest): Promise<string> {
    try {
      // Apply customization if provided
      const customizedRequest = request.customize
        ? await request.customize(this.id, request)
        : request

      const {
        from,
        to,
        url,
        method,
        fallbackUrl,
        fallbackMethod,
        statusCallback,
        statusCallbackEvent,
        sendDigits,
        machineDetection,
        machineDetectionTimeout,
        timeout,
      } = customizedRequest

      // Validate required fields
      if (!from || !to || !url) {
        throw new ProviderError(
          'Voice request must include from, to, and url',
          this.id,
          'voice',
          'INVALID_REQUEST'
        )
      }

      // Build form data
      const form = new FormData()
      form.append('From', from)
      form.append('To', to)
      form.append('Url', url)

      // Add optional fields
      if (method) form.append('Method', method)
      if (fallbackUrl) form.append('FallbackUrl', fallbackUrl)
      if (fallbackMethod) form.append('FallbackMethod', fallbackMethod)
      if (statusCallback) form.append('StatusCallback', statusCallback)
      if (statusCallbackEvent) {
        statusCallbackEvent.forEach((event) => form.append('StatusCallbackEvent', event))
      }
      if (sendDigits) form.append('SendDigits', sendDigits)
      if (machineDetection) form.append('MachineDetection', machineDetection)
      if (machineDetectionTimeout) {
        form.append('MachineDetectionTimeout', String(machineDetectionTimeout))
      }
      if (timeout) form.append('Timeout', String(timeout))

      // Make API request
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Calls.json`,
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

      const responseBody = (await response.json()) as TwilioResponse

      if (response.ok && responseBody.sid) {
        return responseBody.sid
      }

      // Handle error response
      throw new ProviderError(
        responseBody.message || `Twilio API error: ${response.status}`,
        this.id,
        'voice',
        'API_ERROR',
        responseBody
      )
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error
      }

      throw new ProviderError(
        `Failed to send voice call: ${error instanceof Error ? error.message : String(error)}`,
        this.id,
        'voice',
        'SEND_FAILED',
        error
      )
    }
  }
}
