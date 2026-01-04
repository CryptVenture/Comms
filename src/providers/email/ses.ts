import AWSSignersV4 from '../../util/aws/v4'
import { sha256 } from '../../util/crypto'
import fetch from '../../util/request'
import MailComposer from 'nodemailer/lib/mail-composer'
import qs from 'querystring'
import type { EmailRequest } from '../../models/notification-request'
import { ProviderError } from '../../types/errors'

/**
 * AWS SES configuration options
 */
export interface SesConfig {
  /** AWS region (e.g., 'us-east-1', 'eu-west-1') */
  region: string
  /** AWS access key ID */
  accessKeyId: string
  /** AWS secret access key */
  secretAccessKey: string
  /** Optional AWS session token for temporary credentials */
  sessionToken?: string
  [key: string]: unknown
}

/**
 * AWS credentials
 */
interface SesCredentials {
  region: string
  accessKeyId: string
  secretAccessKey: string
  sessionToken?: string
}

/**
 * AWS SES Email Provider
 *
 * Sends emails using AWS Simple Email Service (SES) API.
 * Uses AWS Signature Version 4 for authentication.
 *
 * Note: This implementation uses the SES API directly. Consider upgrading to
 * @aws-sdk/client-ses for better TypeScript support and modern AWS SDK features.
 *
 * @example
 * ```typescript
 * // Create provider with permanent credentials
 * const provider = new EmailSesProvider({
 *   region: 'us-east-1',
 *   accessKeyId: 'YOUR_ACCESS_KEY_ID',
 *   secretAccessKey: 'YOUR_SECRET_ACCESS_KEY'
 * })
 *
 * // With temporary credentials (STS)
 * const provider = new EmailSesProvider({
 *   region: 'us-east-1',
 *   accessKeyId: 'YOUR_TEMP_ACCESS_KEY_ID',
 *   secretAccessKey: 'YOUR_TEMP_SECRET_ACCESS_KEY',
 *   sessionToken: 'YOUR_SESSION_TOKEN'
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
 * @see https://docs.aws.amazon.com/ses/latest/APIReference/API_SendRawEmail.html
 */
export default class EmailSesProvider {
  /** Provider identifier */
  readonly id: string = 'email-ses-provider'

  /** AWS credentials */
  private readonly credentials: SesCredentials

  /**
   * Create a new AWS SES email provider
   *
   * @param config - AWS SES configuration
   * @throws {ProviderError} If required credentials are missing
   */
  constructor({ region, accessKeyId, secretAccessKey, sessionToken }: SesConfig) {
    if (!region || !accessKeyId || !secretAccessKey) {
      throw new ProviderError(
        'AWS SES requires region, accessKeyId, and secretAccessKey',
        this.id,
        'email',
        'MISSING_CREDENTIALS'
      )
    }

    this.credentials = { region, accessKeyId, secretAccessKey, sessionToken }
  }

  /**
   * Send an email via AWS SES
   *
   * @param request - Email request details
   * @returns A promise that resolves to the SES message ID
   * @throws {ProviderError} If sending fails or validation fails
   */
  async send(request: EmailRequest): Promise<string> {
    try {
      // Validate text content type
      if (request.text) {
        const isValidType =
          typeof request.text === 'string' ||
          Buffer.isBuffer(request.text) ||
          (ArrayBuffer.isView(request.text) &&
            (request.text as { constructor: { name: string } }).constructor.name === 'Uint8Array')

        if (!isValidType) {
          throw new ProviderError(
            'The "text" field must be of type string or an instance of Buffer or Uint8Array',
            this.id,
            'email',
            'INVALID_TEXT_TYPE'
          )
        }
      }

      // Apply customization if provided
      const customizedRequest = request.customize
        ? await request.customize(this.id, request)
        : request

      // Build the raw email message
      const { region } = this.credentials
      const host = `email.${region}.amazonaws.com`
      const raw = (await this.getRaw(customizedRequest)).toString('base64')

      // Build the SES API request body
      const body = qs.stringify({
        Action: 'SendRawEmail',
        Version: '2010-12-01',
        'RawMessage.Data': raw,
      })

      // Prepare API request
      const apiRequest = {
        method: 'POST',
        path: '/',
        search: '',
        headers: {
          Host: host,
          'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
          'X-Amz-Content-Sha256': sha256(body, 'hex') as string,
          'User-Agent': 'webventures-comms/v2 (+https://github.com/cryptventure/comms)',
        },
        body,
        region,
      }

      // Sign the request with AWS Signature Version 4
      const signer = new AWSSignersV4(apiRequest, 'ses')
      signer.addAuthorization(this.credentials, new Date())

      // Send the request
      const response = await fetch(`https://${host}${apiRequest.path}`, {
        method: apiRequest.method,
        headers: apiRequest.headers as Record<string, string>,
        body: apiRequest.body,
      })

      const responseText = await response.text()

      // Parse response
      if (response.ok && responseText.includes('<MessageId>')) {
        const match = responseText.match(/<MessageId>(.*)<\/MessageId>/)
        if (match && match[1]) {
          return match[1]
        }
        throw new ProviderError(
          'Failed to extract message ID from SES response',
          this.id,
          'email',
          'PARSE_ERROR'
        )
      } else {
        throw new ProviderError(
          `AWS SES API error: ${responseText}`,
          this.id,
          'email',
          'API_ERROR',
          { statusCode: response.status, response: responseText }
        )
      }
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error
      }
      throw new ProviderError(
        error instanceof Error ? error.message : 'Failed to send email via AWS SES',
        this.id,
        'email',
        'SEND_FAILED',
        error
      )
    }
  }

  /**
   * Build raw email message using nodemailer's MailComposer
   *
   * @param request - Email request without customize function
   * @returns A promise that resolves to the raw email buffer
   * @throws {ProviderError} If email compilation fails
   */
  private async getRaw({ customize: _customize, ...request }: EmailRequest): Promise<Buffer> {
    try {
      const email = new MailComposer(request as never).compile()
      email.keepBcc = true
      return await email.build()
    } catch (error) {
      throw new ProviderError(
        error instanceof Error ? error.message : 'Failed to compile email message',
        this.id,
        'email',
        'COMPILE_FAILED',
        error
      )
    }
  }
}
