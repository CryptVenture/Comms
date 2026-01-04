/**
 * SMS provider configuration types.
 *
 * Supports multiple SMS delivery providers including:
 * - 46elks, Callr, Clickatell, Infobip, Nexmo/Vonage, OVH, Plivo, Twilio, Seven
 * - Custom providers (implement your own send function)
 * - Logger (for development/testing)
 *
 * @module provider-sms
 */

import type { SmsRequest } from './notification-request'

/**
 * Logger provider for development and testing.
 * Logs SMS requests without actually sending them.
 */
export interface SmsProviderLogger {
  type: 'logger'
}

/**
 * Custom SMS provider with user-defined send function.
 *
 * @example
 * ```typescript
 * const customProvider: SmsProviderCustom = {
 *   type: 'custom',
 *   id: 'my-custom-sms-provider',
 *   send: async (request) => {
 *     // Custom implementation
 *     return 'message-id-123';
 *   }
 * };
 * ```
 */
export interface SmsProviderCustom {
  type: 'custom'

  /** Unique identifier for this custom provider */
  id: string

  /**
   * Custom send function implementation.
   *
   * @param request - The SMS request to send
   * @returns Promise resolving to the message ID
   */
  send: (request: SmsRequest) => Promise<string>
}

/**
 * 46elks SMS provider configuration.
 *
 * @see https://46elks.com/
 */
export interface SmsProvider46elks {
  type: '46elks'

  /** 46elks API username */
  apiUsername: string

  /** 46elks API password */
  apiPassword: string
}

/**
 * Callr SMS provider configuration.
 *
 * @see https://www.callr.com/
 */
export interface SmsProviderCallr {
  type: 'callr'

  /** Callr login username */
  login: string

  /** Callr password */
  password: string
}

/**
 * Clickatell SMS provider configuration.
 *
 * @see https://www.clickatell.com/
 */
export interface SmsProviderClickatell {
  type: 'clickatell'

  /**
   * Clickatell One-way integration API key.
   * Obtain from Clickatell dashboard.
   */
  apiKey: string
}

/**
 * Infobip SMS provider configuration.
 *
 * @see https://www.infobip.com/
 */
export interface SmsProviderInfobip {
  type: 'infobip'

  /** Infobip account username */
  username: string

  /** Infobip account password */
  password: string
}

/**
 * Nexmo (now Vonage) SMS provider configuration.
 *
 * @see https://www.vonage.com/communications-apis/sms/
 */
export interface SmsProviderNexmo {
  type: 'nexmo'

  /** Nexmo/Vonage API key */
  apiKey: string

  /** Nexmo/Vonage API secret */
  apiSecret: string
}

/**
 * OVH SMS provider configuration.
 *
 * @see https://www.ovh.com/
 * @see https://github.com/ovh/node-ovh/blob/master/lib/endpoints.js
 */
export interface SmsProviderOvh {
  type: 'ovh'

  /** OVH application key */
  appKey: string

  /** OVH application secret */
  appSecret: string

  /** OVH consumer key */
  consumerKey: string

  /** OVH SMS account identifier */
  account: string

  /**
   * OVH API endpoint host.
   * Examples: 'ovh-eu', 'ovh-ca', 'ovh-us'
   *
   * @see https://github.com/ovh/node-ovh/blob/master/lib/endpoints.js
   */
  host: string
}

/**
 * Plivo SMS provider configuration.
 *
 * @see https://www.plivo.com/
 */
export interface SmsProviderPlivo {
  type: 'plivo'

  /** Plivo Auth ID */
  authId: string

  /** Plivo Auth Token */
  authToken: string
}

/**
 * Twilio SMS provider configuration.
 *
 * @see https://www.twilio.com/sms
 */
export interface SmsProviderTwilio {
  type: 'twilio'

  /** Twilio Account SID */
  accountSid: string

  /** Twilio Auth Token */
  authToken: string
}

/**
 * Seven (7pass) SMS provider configuration.
 *
 * @see https://www.seven.io/
 */
export interface SmsProviderSeven {
  type: 'seven'

  /** Seven API key */
  apiKey: string
}

/**
 * Union type of all SMS provider configurations.
 *
 * Use this type when accepting any SMS provider configuration.
 *
 * @example
 * ```typescript
 * function setupSmsProvider(provider: SmsProvider) {
 *   switch (provider.type) {
 *     case 'twilio':
 *       // Configure Twilio
 *       break;
 *     case 'nexmo':
 *       // Configure Nexmo
 *       break;
 *     // ... handle other providers
 *   }
 * }
 * ```
 */
export type SmsProvider =
  | SmsProviderLogger
  | SmsProviderCustom
  | SmsProvider46elks
  | SmsProviderCallr
  | SmsProviderClickatell
  | SmsProviderInfobip
  | SmsProviderNexmo
  | SmsProviderOvh
  | SmsProviderPlivo
  | SmsProviderTwilio
  | SmsProviderSeven

/** @deprecated Use SmsProvider instead */
export type SmsProviderType = SmsProvider
