import crypto from 'crypto'
import fetch from '../../util/request'
import type { EmailRequest } from '../../models/notification-request'
import { ProviderError } from '../../types/errors'

/**
 * SendGrid configuration options
 */
export interface SendGridConfig {
  /** SendGrid API key */
  apiKey: string
  [key: string]: unknown
}

/**
 * SendGrid API response for errors
 */
interface SendGridErrorResponse {
  errors: Array<{
    message?: string
    field?: string
    help?: string
    [key: string]: unknown
  }>
}

/**
 * SendGrid Email Provider
 *
 * Sends emails using the SendGrid API v3.
 *
 * @example
 * ```typescript
 * // Create provider
 * const provider = new EmailSendGridProvider({
 *   apiKey: 'SG.your-api-key'
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
 * @see https://docs.sendgrid.com/api-reference/mail-send/mail-send
 */
export default class EmailSendGridProvider {
  /** Provider identifier */
  readonly id: string = 'email-sendgrid-provider'

  /** SendGrid API key */
  private readonly apiKey: string

  /**
   * Create a new SendGrid email provider
   *
   * @param config - SendGrid configuration
   * @throws {ProviderError} If API key is missing
   */
  constructor(config: SendGridConfig) {
    if (!config.apiKey) {
      throw new ProviderError('SendGrid API key is required', this.id, 'email', 'MISSING_API_KEY')
    }
    this.apiKey = config.apiKey
  }

  /**
   * Send an email via SendGrid
   *
   * @param request - Email request details
   * @returns A promise that resolves to the notification ID
   * @throws {ProviderError} If sending fails
   */
  async send(request: EmailRequest): Promise<string> {
    try {
      // Apply customization if provided
      const { id, userId, from, replyTo, subject, html, text, headers, to, cc, bcc, attachments } =
        request.customize ? await request.customize(this.id, request) : request

      // Generate notification ID
      const generatedId = id || crypto.randomBytes(16).toString('hex')

      // Build SendGrid API request
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'webventures-comms/v2 (+https://github.com/cryptventure/comms)',
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: to }],
              ...(cc && cc.length > 0 ? { cc: cc.map((email) => ({ email })) } : null),
              ...(bcc && bcc.length > 0 ? { bcc: bcc.map((email) => ({ email })) } : null),
            },
          ],
          from: { email: from },
          ...(replyTo ? { reply_to: { email: replyTo } } : null),
          subject,
          content: [
            ...(text ? [{ type: 'text/plain', value: text }] : []),
            ...(html ? [{ type: 'text/html', value: html }] : []),
          ],
          headers,
          custom_args: {
            id: generatedId,
            ...(userId !== undefined && { userId }),
          },
          ...(attachments && attachments.length > 0
            ? {
                attachments: attachments.map(({ contentType, filename, content }) => ({
                  type: contentType,
                  filename,
                  content: (typeof content === 'string' ? Buffer.from(content) : content).toString(
                    'base64'
                  ),
                })),
              }
            : null),
        }),
      })

      if (response.ok) {
        return generatedId
      } else {
        const responseBody = (await response.json()) as SendGridErrorResponse
        const firstError = responseBody.errors?.[0]
        const message = firstError
          ? Object.keys(firstError)
              .map((key) => `${key}: ${firstError[key]}`)
              .join(', ')
          : 'Unknown error'

        throw new ProviderError(`SendGrid API error: ${message}`, this.id, 'email', 'API_ERROR', {
          statusCode: response.status,
          response: responseBody,
        })
      }
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error
      }
      throw new ProviderError(
        error instanceof Error ? error.message : 'Failed to send email via SendGrid',
        this.id,
        'email',
        'SEND_FAILED',
        error
      )
    }
  }
}
