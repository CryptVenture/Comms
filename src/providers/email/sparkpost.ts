import fetch from '../../util/request'
import type { EmailRequest } from '../../models/notification-request'
import { ProviderError } from '../../types/errors'

/**
 * SparkPost configuration options
 */
export interface SparkPostConfig {
  /** SparkPost API key */
  apiKey: string
  [key: string]: unknown
}

/**
 * SparkPost API success response
 */
interface SparkPostSuccessResponse {
  results: {
    id: string
    total_rejected_recipients: number
    total_accepted_recipients: number
  }
}

/**
 * SparkPost API error response
 */
interface SparkPostErrorResponse {
  errors: Array<{
    message?: string
    description?: string
    code?: string
    [key: string]: unknown
  }>
}

/**
 * SparkPost Email Provider
 *
 * Sends emails using the SparkPost API.
 *
 * @example
 * ```typescript
 * // Create provider
 * const provider = new EmailSparkPostProvider({
 *   apiKey: 'your-sparkpost-api-key'
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
 * @see https://developers.sparkpost.com/api/transmissions/
 */
export default class EmailSparkPostProvider {
  /** Provider identifier */
  readonly id: string = 'email-sparkpost-provider'

  /** SparkPost API key */
  private readonly apiKey: string

  /**
   * Create a new SparkPost email provider
   *
   * @param config - SparkPost configuration
   * @throws {ProviderError} If API key is missing
   */
  constructor(config: SparkPostConfig) {
    if (!config.apiKey) {
      throw new ProviderError('SparkPost API key is required', this.id, 'email', 'MISSING_API_KEY')
    }
    this.apiKey = config.apiKey
  }

  /**
   * Send an email via SparkPost
   *
   * @param request - Email request details
   * @returns A promise that resolves to the SparkPost transmission ID
   * @throws {ProviderError} If sending fails
   */
  async send(request: EmailRequest): Promise<string> {
    try {
      // Apply customization if provided
      const { id, userId, from, replyTo, subject, html, text, headers, to, cc, bcc, attachments } =
        request.customize ? await request.customize(this.id, request) : request

      // Build SparkPost API request
      const response = await fetch('https://api.sparkpost.com/api/v1/transmissions', {
        method: 'POST',
        headers: {
          Authorization: this.apiKey,
          'Content-Type': 'application/json',
          'User-Agent': 'webventures-comms/v2 (+https://github.com/cryptventure/comms)',
        },
        body: JSON.stringify({
          options: {
            transactional: true,
          },
          content: {
            from,
            reply_to: replyTo,
            subject,
            html,
            text,
            headers: {
              ...headers,
              ...(cc && cc.length > 0 ? { CC: cc.join(',') } : null),
            },
            attachments: (attachments || []).map(({ contentType, filename, content }) => ({
              type: contentType,
              name: filename,
              data: (typeof content === 'string' ? Buffer.from(content) : content).toString(
                'base64'
              ),
            })),
          },
          recipients: [
            { address: { email: to } },
            ...(cc || []).map((email) => ({ address: { email, header_to: to } })),
            ...(bcc || []).map((email) => ({ address: { email, header_to: to } })),
          ],
          metadata: {
            ...(id !== undefined && { id }),
            ...(userId !== undefined && { userId }),
          },
        }),
      })

      const responseBody = (await response.json()) as
        | SparkPostSuccessResponse
        | SparkPostErrorResponse

      if (response.ok) {
        const successResponse = responseBody as SparkPostSuccessResponse
        return successResponse.results.id
      } else {
        const errorResponse = responseBody as SparkPostErrorResponse
        const [firstError] = errorResponse.errors
        const message = firstError
          ? Object.keys(firstError)
              .map((key) => `${key}: ${firstError[key as keyof typeof firstError]}`)
              .join(', ')
          : 'Unknown error'

        throw new ProviderError(`SparkPost API error: ${message}`, this.id, 'email', 'API_ERROR', {
          statusCode: response.status,
          response: responseBody,
        })
      }
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error
      }
      throw new ProviderError(
        error instanceof Error ? error.message : 'Failed to send email via SparkPost',
        this.id,
        'email',
        'SEND_FAILED',
        error
      )
    }
  }
}
