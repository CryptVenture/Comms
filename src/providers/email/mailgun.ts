import fetch from '../../util/request'
import FormData from 'form-data'
import type { EmailRequest } from '../../models/notification-request'
import { ProviderError } from '../../types/errors'

/**
 * Mailgun configuration options
 */
export interface MailgunConfig {
  /** Mailgun API key */
  apiKey: string
  /** Mailgun domain name */
  domainName: string
  /** Mailgun API host (default: 'api.mailgun.net') */
  host?: string
  /** Mailgun API version (default: 'v3') */
  version?: string
  [key: string]: unknown
}

/**
 * Mailgun API response
 */
interface MailgunResponse {
  id: string
  message: string
}

/**
 * Mailgun Email Provider
 *
 * Sends emails using the Mailgun API.
 *
 * @example
 * ```typescript
 * // Create provider
 * const provider = new EmailMailgunProvider({
 *   apiKey: 'your-api-key',
 *   domainName: 'mg.example.com'
 * })
 *
 * // With custom host (EU region)
 * const provider = new EmailMailgunProvider({
 *   apiKey: 'your-api-key',
 *   domainName: 'mg.example.com',
 *   host: 'api.eu.mailgun.net'
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
 * @see https://documentation.mailgun.com/en/latest/api-sending.html
 */
export default class EmailMailgunProvider {
  /** Provider identifier */
  readonly id: string = 'email-mailgun-provider'

  /** Base64 encoded API key for authorization */
  private readonly apiKeyBase64: string

  /** Mailgun domain name */
  private readonly domainName: string

  /** Mailgun API host */
  private readonly host: string

  /** Mailgun API version */
  private readonly version: string

  /**
   * Create a new Mailgun email provider
   *
   * @param config - Mailgun configuration
   * @throws {ProviderError} If required configuration is missing
   */
  constructor(config: MailgunConfig) {
    if (!config.apiKey || !config.domainName) {
      throw new ProviderError(
        'Mailgun requires apiKey and domainName',
        this.id,
        'email',
        'MISSING_CONFIG'
      )
    }

    this.apiKeyBase64 = Buffer.from(`api:${config.apiKey}`).toString('base64')
    this.domainName = config.domainName
    this.host = config.host || 'api.mailgun.net'
    this.version = config.version || 'v3'
  }

  /**
   * Send an email via Mailgun
   *
   * @param request - Email request details
   * @returns A promise that resolves to the Mailgun message ID
   * @throws {ProviderError} If sending fails
   */
  async send(request: EmailRequest): Promise<string> {
    try {
      // Apply customization if provided
      const { id, userId, from, replyTo, subject, html, text, headers, to, cc, bcc, attachments } =
        request.customize ? await request.customize(this.id, request) : request

      // Build multipart form data
      const form = new FormData()
      form.append('from', from)
      form.append('to', to)
      form.append('subject', subject)

      if (text) form.append('text', text)
      if (html) form.append('html', html)
      if (replyTo) form.append('h:Reply-To', replyTo)

      if (cc && cc.length > 0) {
        cc.forEach((email) => form.append('cc', email))
      }

      if (bcc && bcc.length > 0) {
        bcc.forEach((email) => form.append('bcc', email))
      }

      if (attachments && attachments.length > 0) {
        attachments.forEach(({ contentType, filename, content }) => {
          form.append('attachment', content, { filename, contentType })
        })
      }

      if (headers) {
        Object.keys(headers).forEach((header) => {
          const value = headers[header]
          form.append(`h:${header}`, String(value))
        })
      }

      if (id) form.append('v:Notification-Id', id)
      if (userId) form.append('v:User-Id', userId)

      // Send request
      const response = await fetch(
        `https://${this.host}/${this.version}/${this.domainName}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${this.apiKeyBase64}`,
            'User-Agent': 'webventures-comms/v2 (+https://github.com/cryptventure/comms)',
          },
          // @ts-expect-error - form-data FormData is compatible with fetch at runtime
          body: form,
        }
      )

      const responseBody = (await response.json()) as MailgunResponse

      if (response.ok) {
        return responseBody.id
      } else {
        throw new ProviderError(
          `Mailgun API error: ${responseBody.message}`,
          this.id,
          'email',
          'API_ERROR',
          { statusCode: response.status, response: responseBody }
        )
      }
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error
      }
      throw new ProviderError(
        error instanceof Error ? error.message : 'Failed to send email via Mailgun',
        this.id,
        'email',
        'SEND_FAILED',
        error
      )
    }
  }
}
