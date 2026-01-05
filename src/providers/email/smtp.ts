import nodemailer from 'nodemailer'
import type { Transporter, SentMessageInfo } from 'nodemailer'
import type { EmailRequest } from '../../models/notification-request'
import { ProviderError } from '../../types/errors'

/**
 * SMTP configuration options
 *
 * @see https://nodemailer.com/smtp/
 */
export interface SmtpConfig {
  /** SMTP host (default: 'localhost') */
  host?: string
  /** SMTP port (default: 587) */
  port?: number
  /** Use secure connection (default: false for port 587, true for port 465) */
  secure?: boolean
  /** Authentication credentials */
  auth?: {
    user: string
    pass: string
  }
  /** TLS options */
  tls?: {
    rejectUnauthorized?: boolean
    [key: string]: unknown
  }
  /** Ignore TLS */
  ignoreTLS?: boolean
  /** Require TLS */
  requireTLS?: boolean
  /** Connection name */
  name?: string
  /** Local address */
  localAddress?: string
  /** Connection timeout in milliseconds */
  connectionTimeout?: number
  /** Greeting timeout in milliseconds */
  greetingTimeout?: number
  /** Socket timeout in milliseconds */
  socketTimeout?: number
  /** Enable logging */
  logger?: boolean
  /** Enable debug */
  debug?: boolean
  /** Authentication method */
  authMethod?: string
  /** Use connection pooling */
  pool?: boolean
  /** Maximum number of connections */
  maxConnections?: number
  /** Maximum number of messages per connection */
  maxMessages?: number
  /** Rate limiting delta */
  rateDelta?: number
  /** Rate limiting */
  rateLimit?: number
  /** Proxy URL */
  proxy?: string
  /** Disable file access */
  disableFileAccess?: boolean
  /** Disable URL access */
  disableUrlAccess?: boolean
  [key: string]: unknown
}

/**
 * SMTP Email Provider
 *
 * Sends emails using the SMTP protocol via nodemailer v7.
 *
 * @example
 * ```typescript
 * // Basic SMTP configuration
 * const provider = new EmailSmtpProvider({
 *   host: 'smtp.gmail.com',
 *   port: 587,
 *   secure: false,
 *   auth: {
 *     user: 'your-email@gmail.com',
 *     pass: 'your-password'
 *   }
 * })
 *
 * // Secure TLS configuration with custom CA certificate
 * import fs from 'fs'
 * const provider = new EmailSmtpProvider({
 *   host: 'smtp.example.com',
 *   port: 465,
 *   secure: true,
 *   auth: {
 *     user: 'user@example.com',
 *     pass: 'password'
 *   },
 *   tls: {
 *     // Specify custom CA certificate if needed
 *     ca: fs.readFileSync('/path/to/ca-cert.pem')
 *   }
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
 * ```
 *
 * **Security Warning: TLS Certificate Verification**
 *
 * Never set `tls.rejectUnauthorized = false` in production. This disables TLS
 * certificate verification and makes your connection vulnerable to man-in-the-middle
 * attacks. Attackers can intercept emails by presenting fraudulent certificates.
 *
 * For development with self-signed certificates, use one of these secure alternatives:
 * - Add your self-signed certificate to the system's trusted CA store
 * - Specify the CA certificate explicitly: `tls: { ca: fs.readFileSync('ca.pem') }`
 * - Use a proper certificate from Let's Encrypt (free) for development servers
 *
 * @see https://nodemailer.com/smtp/
 */
export default class EmailSmtpProvider {
  /** Provider identifier */
  readonly id: string = 'email-smtp-provider'

  /** Nodemailer transporter instance */
  private readonly transporter: Transporter<SentMessageInfo>

  /**
   * Create a new SMTP email provider
   *
   * @param config - SMTP configuration object or connection string
   * @throws {ProviderError} If transporter creation fails
   */
  constructor(config: SmtpConfig | string) {
    try {
      this.transporter = nodemailer.createTransport(config)
    } catch (error) {
      throw new ProviderError(
        'Failed to create SMTP transporter',
        this.id,
        'email',
        'TRANSPORTER_CREATION_FAILED',
        error
      )
    }
  }

  /**
   * Send an email via SMTP
   *
   * @param request - Email request details
   * @returns A promise that resolves to the message ID
   * @throws {ProviderError} If sending fails
   */
  async send(request: EmailRequest): Promise<string> {
    try {
      // Apply customization if provided
      const { customize: _customize, ...emailData } = request.customize
        ? await request.customize(this.id, request)
        : request

      // Send the email
      const result = await this.transporter.sendMail(emailData as never)

      // Return the message ID
      return result.messageId
    } catch (error) {
      throw new ProviderError(
        error instanceof Error ? error.message : 'Failed to send email via SMTP',
        this.id,
        'email',
        'SEND_FAILED',
        error
      )
    }
  }
}
