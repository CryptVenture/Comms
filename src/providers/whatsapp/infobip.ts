/**
 * Infobip WhatsApp Provider
 * Sends WhatsApp messages via Infobip API
 *
 * @module providers/whatsapp/infobip
 * @see https://www.infobip.com/docs/whatsapp
 */

import fetch from '../../util/request'
import { ProviderError } from '../../types/errors'
import type { WhatsappRequest } from '../../models/notification-request'

/**
 * Infobip provider configuration
 */
export interface InfobipConfig {
  baseUrl: string
  apiKey: string
}

/**
 * Infobip API response
 */
interface InfobipResponse {
  messages?: Array<{
    messageId: string
    status?: {
      groupId?: number
      groupName?: string
      id?: number
      name?: string
      description?: string
    }
  }>
  messageId?: string
  requestError?: {
    serviceException?: {
      messageId?: string
      text?: string
      [key: string]: unknown
    }
  }
}

/**
 * Infobip WhatsApp Provider
 *
 * Implements WhatsApp messaging using the Infobip API.
 * Supports text, template, document, image, audio, video, and sticker messages.
 *
 * @example
 * ```typescript
 * const provider = new WhatsappInfobipProvider({
 *   baseUrl: 'https://api.infobip.com',
 *   apiKey: 'YOUR_API_KEY'
 * })
 *
 * // Send text message
 * await provider.send({
 *   from: '447860099299',
 *   to: '447860000000',
 *   type: 'text',
 *   text: 'Hello from WhatsApp!'
 * })
 *
 * // Send template message
 * await provider.send({
 *   from: '447860099299',
 *   to: '447860000000',
 *   type: 'template',
 *   templateName: 'welcome_message',
 *   templateData: { name: 'John' }
 * })
 * ```
 */
export default class WhatsappInfobipProvider {
  readonly id: string = 'whatsapp-infobip-provider'
  private readonly baseUrl: string
  private readonly apiKey: string

  /**
   * Creates a new Infobip WhatsApp provider
   *
   * @param config - Infobip configuration
   * @throws {ProviderError} If baseUrl or apiKey is missing
   */
  constructor({ baseUrl, apiKey }: InfobipConfig) {
    if (!baseUrl || !apiKey) {
      throw new ProviderError(
        'Infobip baseUrl and apiKey are required',
        this.id,
        'whatsapp',
        'MISSING_CREDENTIALS'
      )
    }

    this.baseUrl = baseUrl
    this.apiKey = apiKey
  }

  /**
   * Sends a WhatsApp message via Infobip
   *
   * @param request - WhatsApp message request
   * @returns Message ID from Infobip
   * @throws {ProviderError} If the API request fails
   *
   * @example
   * ```typescript
   * // Text message
   * const messageId = await provider.send({
   *   from: '447860099299',
   *   to: '447860000000',
   *   type: 'text',
   *   text: 'Hello World!'
   * })
   *
   * // Image message
   * await provider.send({
   *   from: '447860099299',
   *   to: '447860000000',
   *   type: 'image',
   *   mediaUrl: 'https://example.com/image.jpg'
   * })
   *
   * // Template message
   * await provider.send({
   *   from: '447860099299',
   *   to: '447860000000',
   *   type: 'template',
   *   templateName: 'order_confirmation',
   *   templateData: { orderId: '12345' }
   * })
   * ```
   */
  async send(request: WhatsappRequest): Promise<string> {
    try {
      // Apply customization if provided
      const customizedRequest = request.customize
        ? await request.customize(this.id, request)
        : request

      const { from, to, type, messageId, text, mediaUrl, templateName, templateData, ...rest } =
        customizedRequest

      // Validate required fields
      if (!from || !to || !type) {
        throw new ProviderError(
          'WhatsApp request must include from, to, and type',
          this.id,
          'whatsapp',
          'INVALID_REQUEST'
        )
      }

      // Validate type-specific fields
      if (type === 'text' && !text) {
        throw new ProviderError(
          'WhatsApp text message must include text',
          this.id,
          'whatsapp',
          'INVALID_REQUEST'
        )
      }

      if (type === 'template' && !templateName) {
        throw new ProviderError(
          'WhatsApp template message must include templateName',
          this.id,
          'whatsapp',
          'INVALID_REQUEST'
        )
      }

      if (['image', 'document', 'audio', 'video', 'sticker'].includes(type) && !mediaUrl) {
        throw new ProviderError(
          `WhatsApp ${type} message must include mediaUrl`,
          this.id,
          'whatsapp',
          'INVALID_REQUEST'
        )
      }

      // Construct the payload (remove '+' prefix from phone numbers)
      const payload = {
        from: (from || '').replace('+', ''),
        to: (to || '').replace('+', ''),
        messageId,
        content: {
          text,
          mediaUrl,
          templateName,
          templateData,
        },
        ...rest,
      }

      // Make API request
      const response = await fetch(`${this.baseUrl}/whatsapp/1/message/${type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `App ${this.apiKey}`,
          'User-Agent': 'webventures-comms/v2 (+https://github.com/cryptventure/comms)',
        },
        // Template messages expect an array, others expect a single object
        body: JSON.stringify(type === 'template' ? [payload] : payload),
      })

      const responseBody = (await response.json()) as InfobipResponse

      if (response.ok) {
        // Handle the potential array or single object response
        const [message] = Array.isArray(responseBody.messages)
          ? responseBody.messages
          : [responseBody]

        if (message?.messageId) {
          return message.messageId
        }

        throw new ProviderError(
          'Infobip API returned success but no messageId',
          this.id,
          'whatsapp',
          'INVALID_RESPONSE',
          responseBody
        )
      }

      // Handle error response
      if (responseBody.requestError?.serviceException) {
        const error = responseBody.requestError.serviceException
        const message = Object.keys(error)
          .map((key) => `${key}: ${error[key]}`)
          .join(', ')

        throw new ProviderError(message, this.id, 'whatsapp', 'API_ERROR', error)
      }

      throw new ProviderError(
        `Infobip API error: ${JSON.stringify(responseBody)}`,
        this.id,
        'whatsapp',
        'API_ERROR',
        responseBody
      )
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error
      }

      throw new ProviderError(
        `Failed to send WhatsApp message: ${error instanceof Error ? error.message : String(error)}`,
        this.id,
        'whatsapp',
        'SEND_FAILED',
        error
      )
    }
  }
}
