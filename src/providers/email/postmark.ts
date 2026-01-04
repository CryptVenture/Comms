import crypto from 'crypto'
import fetch from '../../util/request'
import type { EmailRequest } from '../../models/notification-request'
import { ProviderError } from '../../types/errors'

/**
 * Postmark configuration options
 */
export interface PostmarkConfig {
  /** Postmark Server Token */
  serverToken: string
  [key: string]: unknown
}

/**
 * Postmark API success response
 */
interface PostmarkSuccessResponse {
  To: string
  SubmittedAt: string
  MessageID: string
  ErrorCode: number
  Message: string
}

/**
 * Postmark API error response
 */
interface PostmarkErrorResponse {
  ErrorCode: number
  Message: string
}

/**
 * Postmark Email Provider
 *
 * Sends emails using the Postmark API.
 *
 * @example
 * ```typescript
 * // Create provider
 * const provider = new EmailPostmarkProvider({
 *   serverToken: 'your-postmark-server-token'
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
 * @see https://postmarkapp.com/developer/api/email-api
 */
export default class EmailPostmarkProvider {
  /** Provider identifier */
  readonly id: string = 'email-postmark-provider'

  /** Postmark Server Token */
  private readonly serverToken: string

  /**
   * Create a new Postmark email provider
   *
   * @param config - Postmark configuration
   * @throws {ProviderError} If server token is missing
   */
  constructor(config: PostmarkConfig) {
    if (!config.serverToken) {
      throw new ProviderError(
        'Postmark server token is required',
        this.id,
        'email',
        'MISSING_API_KEY'
      )
    }
    this.serverToken = config.serverToken
  }

  /**
   * Send an email via Postmark
   *
   * @param request - Email request details
   * @returns A promise that resolves to the Postmark MessageID
   * @throws {ProviderError} If sending fails
   */
  async send(request: EmailRequest): Promise<string> {
    try {
      // Apply customization if provided
      const { id, userId, from, replyTo, subject, html, text, headers, to, cc, bcc, attachments } =
        request.customize ? await request.customize(this.id, request) : request

      // Generate notification ID for metadata
      const generatedId = id || crypto.randomBytes(16).toString('hex')

      // Build Postmark API request
      const response = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Postmark-Server-Token': this.serverToken,
          'User-Agent': 'webventures-comms/v2 (+https://github.com/cryptventure/comms)',
        },
        body: JSON.stringify({
          From: from,
          To: to,
          ...(cc && cc.length > 0 ? { Cc: cc.join(',') } : null),
          ...(bcc && bcc.length > 0 ? { Bcc: bcc.join(',') } : null),
          Subject: subject,
          ...(text ? { TextBody: text } : null),
          ...(html ? { HtmlBody: html } : null),
          ...(replyTo ? { ReplyTo: replyTo } : null),
          ...(headers && Object.keys(headers).length > 0
            ? {
                Headers: Object.entries(headers).map(([Name, Value]) => ({
                  Name,
                  Value: String(Value),
                })),
              }
            : null),
          ...(attachments && attachments.length > 0
            ? {
                Attachments: attachments.map(({ contentType, filename, content }) => ({
                  Name: filename,
                  Content: (typeof content === 'string' ? Buffer.from(content) : content).toString(
                    'base64'
                  ),
                  ContentType: contentType,
                })),
              }
            : null),
          Metadata: {
            id: generatedId,
            ...(userId !== undefined && { userId }),
          },
        }),
      })

      const responseBody = (await response.json()) as
        | PostmarkSuccessResponse
        | PostmarkErrorResponse

      if (response.ok) {
        const successResponse = responseBody as PostmarkSuccessResponse
        return successResponse.MessageID
      } else {
        const errorResponse = responseBody as PostmarkErrorResponse
        const message = errorResponse.Message || 'Unknown error'

        throw new ProviderError(
          `Postmark API error: ${message} (code: ${errorResponse.ErrorCode})`,
          this.id,
          'email',
          'API_ERROR',
          {
            statusCode: response.status,
            response: responseBody,
          }
        )
      }
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error
      }
      throw new ProviderError(
        error instanceof Error ? error.message : 'Failed to send email via Postmark',
        this.id,
        'email',
        'SEND_FAILED',
        error
      )
    }
  }
}
