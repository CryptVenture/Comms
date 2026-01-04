import nodemailer from 'nodemailer'
import type { Transporter, SentMessageInfo } from 'nodemailer'
import type { EmailRequest } from '../../models/notification-request'
import { ProviderError } from '../../types/errors'

/**
 * Sendmail configuration options
 *
 * @see https://nodemailer.com/transports/sendmail/
 */
export interface SendmailConfig {
  /** Path to the sendmail command (default: 'sendmail') */
  path?: string
  /** Newline style: 'unix' or 'windows' (default: 'unix') */
  newline?: 'unix' | 'windows'
  /** Additional command line arguments */
  args?: string[]
  /** Attach data URLs */
  attachDataUrls?: boolean
  /** Disable file access */
  disableFileAccess?: boolean
  /** Disable URL access */
  disableUrlAccess?: boolean
  /** Always set sendmail to true */
  sendmail?: true
  [key: string]: unknown
}

/**
 * Sendmail Email Provider
 *
 * Sends emails using the sendmail command via nodemailer v7.
 * Uses the local sendmail binary to send emails.
 *
 * @example
 * ```typescript
 * // Basic sendmail configuration
 * const provider = new EmailSendmailProvider({
 *   path: '/usr/sbin/sendmail',
 *   newline: 'unix'
 * })
 *
 * // With custom arguments
 * const provider = new EmailSendmailProvider({
 *   path: '/usr/sbin/sendmail',
 *   newline: 'unix',
 *   args: ['-f', 'sender@example.com']
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
 * @see https://nodemailer.com/transports/sendmail/
 */
export default class EmailSendmailProvider {
  /** Provider identifier */
  readonly id: string = 'email-sendmail-provider'

  /** Nodemailer transporter instance */
  private readonly transporter: Transporter<SentMessageInfo>

  /**
   * Create a new sendmail email provider
   *
   * @param config - Sendmail configuration object
   * @throws {ProviderError} If transporter creation fails
   */
  constructor(config: SendmailConfig) {
    try {
      // Ensure sendmail is set to true
      const sendmailConfig = {
        ...config,
        sendmail: true as const,
      }
      this.transporter = nodemailer.createTransport(sendmailConfig)
    } catch (error) {
      throw new ProviderError(
        'Failed to create sendmail transporter',
        this.id,
        'email',
        'TRANSPORTER_CREATION_FAILED',
        error
      )
    }
  }

  /**
   * Send an email via sendmail
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
      return (result as { messageId: string }).messageId
    } catch (error) {
      throw new ProviderError(
        error instanceof Error ? error.message : 'Failed to send email via sendmail',
        this.id,
        'email',
        'SEND_FAILED',
        error
      )
    }
  }
}
