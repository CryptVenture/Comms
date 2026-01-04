/**
 * Email provider configuration types.
 *
 * Supports multiple email delivery providers including:
 * - SMTP (standard email protocol with extensive configuration options)
 * - Sendmail (local sendmail binary)
 * - Cloud providers: Mailgun, Mandrill, SendGrid, AWS SES, SparkPost
 * - Custom providers (implement your own send function)
 * - Logger (for development/testing)
 *
 * @module provider-email
 */

import type { EmailRequest } from './notification-request'

/**
 * Logger provider for development and testing.
 * Logs email requests without actually sending them.
 */
export interface EmailProviderLogger {
  type: 'logger'
}

/**
 * Custom email provider with user-defined send function.
 *
 * @example
 * ```typescript
 * const customProvider: EmailProviderCustom = {
 *   type: 'custom',
 *   id: 'my-custom-provider',
 *   send: async (request) => {
 *     // Custom implementation
 *     return 'message-id-123';
 *   }
 * };
 * ```
 */
export interface EmailProviderCustom {
  type: 'custom'

  /** Unique identifier for this custom provider */
  id: string

  /**
   * Custom send function implementation.
   *
   * @param request - The email request to send
   * @returns Promise resolving to the message ID
   */
  send: (request: EmailRequest) => Promise<string>
}

/**
 * Sendmail provider configuration.
 *
 * Uses the local sendmail binary to send emails.
 * Suitable for systems with a configured local mail transfer agent.
 *
 * @see https://nodemailer.com/transports/sendmail/
 */
export interface EmailProviderSendmail {
  type: 'sendmail'

  /** Always true for sendmail provider */
  sendmail: true

  /** Path to the sendmail binary (defaults to 'sendmail') */
  path: string

  /** Line ending format */
  newline: 'windows' | 'unix'

  /** Optional command-line arguments for sendmail */
  args?: string[]

  /** Allow data: URLs in message content */
  attachDataUrls?: boolean

  /** Disable file:// protocol access */
  disableFileAccess?: boolean

  /** Disable http:// and https:// protocol access */
  disableUrlAccess?: boolean
}

/**
 * Login authentication for SMTP.
 * Standard username/password authentication.
 */
export interface SmtpAuthLogin {
  type?: 'login'

  /** SMTP username */
  user: string

  /** SMTP password */
  pass: string
}

/**
 * OAuth 2.0 three-legged authentication for SMTP.
 *
 * @see https://nodemailer.com/smtp/oauth2/#oauth-3lo
 */
export interface SmtpAuthOAuth2ThreeLegged {
  type: 'oauth2'

  /** User email address */
  user: string

  /** OAuth client ID */
  clientId?: string

  /** OAuth client secret */
  clientSecret?: string

  /** OAuth refresh token */
  refreshToken?: string

  /** OAuth access token */
  accessToken?: string

  /** Access token expiration date */
  expires?: string

  /** OAuth token endpoint URL */
  accessUrl?: string
}

/**
 * OAuth 2.0 two-legged authentication for SMTP.
 * Used for service accounts (e.g., Google Workspace).
 *
 * @see https://nodemailer.com/smtp/oauth2/#oauth-2lo
 */
export interface SmtpAuthOAuth2TwoLegged {
  type: 'oauth2'

  /** User email address */
  user: string

  /** Service account client email */
  serviceClient: string

  /** Service account private key (PEM format) */
  privateKey?: string
}

/**
 * SMTP provider configuration.
 *
 * Supports standard SMTP protocol with extensive configuration options
 * including TLS, connection pooling, authentication, and proxy support.
 *
 * @see https://nodemailer.com/smtp/
 *
 * @example
 * ```typescript
 * const smtpProvider: EmailProviderSmtp = {
 *   type: 'smtp',
 *   host: 'smtp.gmail.com',
 *   port: 587,
 *   auth: {
 *     user: 'user@gmail.com',
 *     pass: 'password'
 *   }
 * };
 * ```
 */
export interface EmailProviderSmtp {
  type: 'smtp'

  // General options
  /** SMTP port (defaults to 587) */
  port?: 25 | 465 | 587

  /** SMTP server hostname (defaults to 'localhost') */
  host?: string

  /** Authentication configuration */
  auth: SmtpAuthLogin | SmtpAuthOAuth2ThreeLegged | SmtpAuthOAuth2TwoLegged

  /** SMTP authentication method (defaults to 'PLAIN') */
  authMethod?: string

  // TLS options
  /**
   * Use TLS/SSL connection.
   * If true, connects on port 465 by default.
   * If false, uses STARTTLS on port 587 by default.
   *
   * @see https://nodemailer.com/smtp/#tls-options
   */
  secure?: boolean

  /**
   * TLS socket configuration options.
   *
   * @see https://nodejs.org/api/tls.html#tls_class_tls_tlssocket
   */
  tls?: Record<string, unknown>

  /** Do not upgrade connection to TLS even if available */
  ignoreTLS?: boolean

  /** Require TLS connection (fail if unavailable) */
  requireTLS?: boolean

  // Connection options
  /**
   * Hostname to use in HELO/EHLO command.
   * Defaults to machine hostname.
   *
   * @see https://nodemailer.com/smtp/#connection-options
   */
  name?: string

  /** Local network interface to bind to */
  localAddress?: string

  /** Connection timeout in milliseconds */
  connectionTimeout?: number

  /** Greeting timeout in milliseconds */
  greetingTimeout?: number

  /** Socket inactivity timeout in milliseconds */
  socketTimeout?: number

  // Debug options
  /**
   * Enable logging (outputs to console).
   *
   * @see https://nodemailer.com/smtp/#debug-options
   */
  logger?: boolean

  /** Enable debug mode (logs SMTP traffic) */
  debug?: boolean

  // Security options
  /**
   * Disable file:// protocol in message content.
   *
   * @see https://nodemailer.com/smtp/#security-options
   */
  disableFileAccess?: boolean

  /** Disable http:// and https:// protocols in message content */
  disableUrlAccess?: boolean

  // Pooling options
  /**
   * Enable connection pooling.
   *
   * @see https://nodemailer.com/smtp/pooled/
   */
  pool?: boolean

  /** Maximum number of simultaneous connections */
  maxConnections?: number

  /** Maximum number of messages per connection */
  maxMessages?: number

  /** Time window for rate limiting in milliseconds */
  rateDelta?: number

  /** Maximum number of messages in rateDelta time */
  rateLimit?: number

  // Proxy options
  /**
   * SOCKS proxy URL.
   *
   * @see https://nodemailer.com/smtp/proxies/
   */
  proxy?: string
}

/**
 * Mailgun provider configuration.
 *
 * @see https://www.mailgun.com/
 */
export interface EmailProviderMailgun {
  type: 'mailgun'

  /** Mailgun API key */
  apiKey: string

  /** Mailgun domain name */
  domainName: string
}

/**
 * Mandrill (Mailchimp Transactional) provider configuration.
 *
 * @see https://mailchimp.com/developer/transactional/
 */
export interface EmailProviderMandrill {
  type: 'mandrill'

  /** Mandrill API key */
  apiKey: string
}

/**
 * SendGrid provider configuration.
 *
 * @see https://sendgrid.com/
 */
export interface EmailProviderSendGrid {
  type: 'sendgrid'

  /** SendGrid API key */
  apiKey: string
}

/**
 * AWS Simple Email Service (SES) provider configuration.
 *
 * @see https://aws.amazon.com/ses/
 */
export interface EmailProviderSes {
  type: 'ses'

  /** AWS region (e.g., 'us-east-1', 'eu-west-1') */
  region: string

  /** AWS access key ID */
  accessKeyId: string

  /** AWS secret access key */
  secretAccessKey: string

  /** Optional AWS session token for temporary credentials */
  sessionToken?: string | null
}

/**
 * SparkPost provider configuration.
 *
 * @see https://www.sparkpost.com/
 */
export interface EmailProviderSparkPost {
  type: 'sparkpost'

  /** SparkPost API key */
  apiKey: string
}

/**
 * Union type of all email provider configurations.
 *
 * Use this type when accepting any email provider configuration.
 *
 * @example
 * ```typescript
 * function setupEmailProvider(provider: EmailProvider) {
 *   switch (provider.type) {
 *     case 'smtp':
 *       // Configure SMTP
 *       break;
 *     case 'mailgun':
 *       // Configure Mailgun
 *       break;
 *     // ... handle other providers
 *   }
 * }
 * ```
 */
export type EmailProvider =
  | EmailProviderLogger
  | EmailProviderCustom
  | EmailProviderSendmail
  | EmailProviderSmtp
  | EmailProviderMailgun
  | EmailProviderMandrill
  | EmailProviderSendGrid
  | EmailProviderSes
  | EmailProviderSparkPost

/** @deprecated Use EmailProvider instead */
export type EmailProviderType = EmailProvider
