import EmailLoggerProvider from '../logger'
import EmailMailgunProvider from './mailgun'
import EmailMandrillProvider from './mandrill'
import EmailNotificationCatcherProvider from './notificationCatcher'
import EmailPostmarkProvider from './postmark'
import EmailSendGridProvider from './sendgrid'
import EmailSesProvider from './ses'
import EmailSendmailProvider from './sendmail'
import EmailSmtpProvider from './smtp'
import EmailSparkPostProvider from './sparkpost'
import type { EmailRequest } from '../../models/notification-request'
import { ConfigurationError } from '../../types/errors'

/**
 * Email provider interface
 *
 * All email providers must implement this interface to send email notifications.
 */
export interface EmailProviderType {
  /** Unique identifier for the provider */
  id: string

  /**
   * Send an email notification
   *
   * @param request - The email request details
   * @returns A promise that resolves to the notification ID
   */
  send(request: EmailRequest): Promise<string>
}

/**
 * Factory function to create email provider instances
 *
 * @example
 * ```typescript
 * // Create SMTP provider
 * const provider = factory({
 *   type: 'smtp',
 *   host: 'smtp.gmail.com',
 *   port: 587,
 *   auth: { user: 'user@gmail.com', pass: 'password' }
 * })
 *
 * // Create SendGrid provider
 * const provider = factory({
 *   type: 'sendgrid',
 *   apiKey: 'your-api-key'
 * })
 * ```
 *
 * @param config - Provider configuration object with type and provider-specific settings
 * @returns An instance of the specified email provider
 * @throws {ConfigurationError} If the provider type is unknown
 */
export default function factory({
  type,
  ...config
}: {
  type: string
  [key: string]: unknown
}): EmailProviderType {
  switch (type) {
    // Development
    case 'logger':
      return new EmailLoggerProvider(config, 'email')

    case 'notificationcatcher':
      return new EmailNotificationCatcherProvider('email')

    // Custom
    case 'custom':
      return config as unknown as EmailProviderType

    // Protocols
    case 'sendmail':
      return new EmailSendmailProvider(config as never)

    case 'smtp':
      return new EmailSmtpProvider(config as never)

    // Providers
    case 'mailgun':
      return new EmailMailgunProvider(config as never)

    case 'mandrill':
      return new EmailMandrillProvider(config as never)

    case 'postmark':
      return new EmailPostmarkProvider(config as never)

    case 'sendgrid':
      return new EmailSendGridProvider(config as never)

    case 'ses':
      return new EmailSesProvider(config as never)

    case 'sparkpost':
      return new EmailSparkPostProvider(config as never)

    default:
      throw new ConfigurationError(`Unknown email provider "${type}".`, 'EMAIL_UNKNOWN_PROVIDER')
  }
}
