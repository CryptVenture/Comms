import fetch from '../../util/request'
import type { EmailRequest } from '../../models/notification-request'
import { ProviderError } from '../../types/errors'

/**
 * Mandrill configuration options
 */
export interface MandrillConfig {
  /** Mandrill API key */
  apiKey: string
  [key: string]: unknown
}

/**
 * Mandrill API response for successful send
 */
interface MandrillSuccessResponse {
  _id: string
  email: string
  status: string
  reject_reason: string | null
}

/**
 * Mandrill API error response
 */
interface MandrillErrorResponse {
  status: string
  code: number
  name: string
  message: string
}

/**
 * Mandrill Email Provider
 *
 * Sends emails using the Mandrill API (Mailchimp Transactional Email).
 *
 * @example
 * ```typescript
 * // Create provider
 * const provider = new EmailMandrillProvider({
 *   apiKey: 'your-mandrill-api-key'
 * })
 *
 * // Send email
 * const messageId = await provider.send({
 *   from: 'sender@example.com',
 *   to: 'recipient@example.com',
 *   subject: 'Hello',
 *   text: 'Hello world',
 *   html: '<p>Hello world</p>'
 * })
 *
 * // With CC and BCC
 * const messageId = await provider.send({
 *   from: 'sender@example.com',
 *   to: 'recipient@example.com',
 *   cc: ['cc@example.com'],
 *   bcc: ['bcc@example.com'],
 *   subject: 'Hello',
 *   html: '<p>Hello world</p>'
 * })
 *
 * // With attachments
 * const messageId = await provider.send({
 *   from: 'sender@example.com',
 *   to: 'recipient@example.com',
 *   subject: 'Document',
 *   html: '<p>Please find attached</p>',
 *   attachments: [{
 *     contentType: 'application/pdf',
 *     filename: 'document.pdf',
 *     content: Buffer.from('...')
 *   }]
 * })
 * ```
 *
 * @see https://mailchimp.com/developer/transactional/api/messages/
 */
export default class EmailMandrillProvider {
  /** Provider identifier */
  readonly id: string = 'email-mandrill-provider'

  /** Mandrill API key */
  private readonly apiKey: string

  /**
   * Create a new Mandrill email provider
   *
   * @param config - Mandrill configuration
   * @throws {ProviderError} If API key is missing
   */
  constructor(config: MandrillConfig) {
    if (!config.apiKey) {
      throw new ProviderError('Mandrill API key is required', this.id, 'email', 'MISSING_CONFIG')
    }
    this.apiKey = config.apiKey
  }

  /**
   * Send an email via Mandrill
   *
   * @param request - Email request details
   * @returns A promise that resolves to the Mandrill message ID
   * @throws {ProviderError} If sending fails
   */
  async send(request: EmailRequest): Promise<string> {
    try {
      // Apply customization if provided
      const { id, userId, from, replyTo, subject, html, text, headers, to, cc, bcc, attachments } =
        request.customize ? await request.customize(this.id, request) : request

      // Build Mandrill API request
      const response = await fetch('https://mandrillapp.com/api/1.0/messages/send.json', {
        method: 'POST',
        headers: {
          'User-Agent': 'webventures-comms/v2 (+https://github.com/cryptventure/comms)',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: this.apiKey,
          message: {
            from_email: from,
            to: [
              { email: to, type: 'to' },
              ...(cc && cc.length ? cc.map((email) => ({ email, type: 'cc' })) : []),
              ...(bcc && bcc.length ? bcc.map((email) => ({ email, type: 'bcc' })) : []),
            ],
            subject,
            text,
            html,
            headers: {
              ...(replyTo ? { 'Reply-To': replyTo } : null),
              ...headers,
            },
            ...(attachments && attachments.length
              ? {
                  attachments: attachments.map(({ contentType, filename, content }) => {
                    return {
                      type: contentType,
                      name: filename,
                      content: (typeof content === 'string'
                        ? Buffer.from(content)
                        : content
                      ).toString('base64'),
                    }
                  }),
                }
              : null),
            metadata: {
              ...(id !== undefined && { id }),
              ...(userId !== undefined && { userId }),
            },
          },
          async: false,
        }),
      })

      const responseBody = (await response.json()) as
        | MandrillSuccessResponse[]
        | MandrillErrorResponse

      if (response.ok && Array.isArray(responseBody) && responseBody.length > 0) {
        const messageId = responseBody[0]?._id
        if (messageId) {
          return messageId
        }
        throw new ProviderError(
          'No message ID in Mandrill response',
          this.id,
          'email',
          'MISSING_MESSAGE_ID'
        )
      } else {
        const errorResponse = responseBody as MandrillErrorResponse
        const message = Object.keys(errorResponse)
          .map((key) => `${key}: ${errorResponse[key as keyof MandrillErrorResponse]}`)
          .join(', ')

        throw new ProviderError(`Mandrill API error: ${message}`, this.id, 'email', 'API_ERROR', {
          statusCode: response.status,
          response: responseBody,
        })
      }
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error
      }
      throw new ProviderError(
        error instanceof Error ? error.message : 'Failed to send email via Mandrill',
        this.id,
        'email',
        'SEND_FAILED',
        error
      )
    }
  }
}
