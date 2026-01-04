/**
 * Node.js adapter
 * Provides standard configuration for Node.js applications
 */

import type { CommsSdkConfig } from '../types/config'
import { CommsSdk } from '../index'

/**
 * Create WebVentures Comms SDK instance for standard Node.js applications
 *
 * @example
 * import { createNodeComms } from '@webventures/comms/adapters'
 *
 * const comms = createNodeComms({
 *   channels: {
 *     email: {
 *       providers: [{type: 'smtp', host: 'smtp.gmail.com', port: 587, secure: false, auth: {user: '...', pass: '...'}}]
 *     }
 *   }
 * })
 *
 * await comms.send({
 *   email: {from: 'noreply@example.com', to: 'user@example.com', subject: 'Hello', text: 'Hi!'}
 * })
 */
export function createNodeComms(config: CommsSdkConfig): CommsSdk {
  return new CommsSdk(config)
}

/**
 * Create WebVentures Comms SDK with environment variables
 * Reads configuration from environment variables
 *
 * @example
 * // .env file:
 * // COMMS_EMAIL_PROVIDER=sendgrid
 * // SENDGRID_API_KEY=xxx
 *
 * import { createNodeCommsFromEnv } from '@webventures/comms/adapters'
 *
 * const comms = createNodeCommsFromEnv()
 */
export function createNodeCommsFromEnv(): CommsSdk {
  const config: CommsSdkConfig = {
    channels: {},
  }

  // Email configuration from env
  const emailProvider = process.env.COMMS_EMAIL_PROVIDER
  if (emailProvider) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    config.channels!.email = {
      providers: [
        {
          type: emailProvider,
          ...(emailProvider === 'sendgrid' && {
            apiKey: process.env.SENDGRID_API_KEY,
          }),
          ...(emailProvider === 'ses' && {
            region: process.env.AWS_REGION,
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          }),
          ...(emailProvider === 'mailgun' && {
            apiKey: process.env.MAILGUN_API_KEY,
            domainName: process.env.MAILGUN_DOMAIN,
          }),
        },
      ],
    }
  }

  // SMS configuration from env
  const smsProvider = process.env.COMMS_SMS_PROVIDER
  if (smsProvider) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    config.channels!.sms = {
      providers: [
        {
          type: smsProvider,
          ...(smsProvider === 'twilio' && {
            accountSid: process.env.TWILIO_ACCOUNT_SID,
            authToken: process.env.TWILIO_AUTH_TOKEN,
          }),
          ...(smsProvider === 'nexmo' && {
            apiKey: process.env.NEXMO_API_KEY,
            apiSecret: process.env.NEXMO_API_SECRET,
          }),
        },
      ],
    }
  }

  // Use notification catcher in development
  if (process.env.NODE_ENV === 'development' && process.env.USE_NOTIFICATION_CATCHER === 'true') {
    config.useNotificationCatcher = true
  }

  return new CommsSdk(config)
}

/**
 * Singleton instance helper for Node.js apps
 * Useful to avoid creating multiple SDK instances
 */
let singletonInstance: CommsSdk | null = null

export function getCommsSingleton(config: CommsSdkConfig): CommsSdk {
  if (!singletonInstance) {
    singletonInstance = createNodeComms(config)
  }
  return singletonInstance
}

/**
 * Reset singleton (useful for testing)
 */
export function resetCommsSingleton(): void {
  singletonInstance = null
}
