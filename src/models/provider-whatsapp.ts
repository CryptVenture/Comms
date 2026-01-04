/**
 * WhatsApp notification provider configuration types.
 *
 * Supports WhatsApp Business messaging through:
 * - Infobip (WhatsApp Business API provider)
 * - Custom providers (implement your own send function)
 * - Logger (for development/testing)
 *
 * @module provider-whatsapp
 */

import type { WhatsappRequest } from './notification-request'

/**
 * Logger provider for development and testing.
 * Logs WhatsApp message requests without actually sending them.
 */
export interface WhatsappProviderLogger {
  type: 'logger'
}

/**
 * Custom WhatsApp provider with user-defined send function.
 *
 * Use this for integrating with other WhatsApp Business API providers
 * or implementing custom business logic.
 *
 * @example
 * ```typescript
 * const customProvider: WhatsappProviderCustom = {
 *   type: 'custom',
 *   id: 'my-custom-whatsapp-provider',
 *   send: async (request) => {
 *     // Custom implementation
 *     return 'message-id-123';
 *   }
 * };
 * ```
 */
export interface WhatsappProviderCustom {
  type: 'custom'

  /** Unique identifier for this custom provider */
  id: string

  /**
   * Custom send function implementation.
   *
   * @param request - The WhatsApp message request to send
   * @returns Promise resolving to the message ID
   */
  send: (request: WhatsappRequest) => Promise<string>
}

/**
 * Infobip WhatsApp provider configuration.
 *
 * Infobip provides WhatsApp Business API services with support for
 * templates, media messages, and two-way messaging.
 *
 * @see https://www.infobip.com/docs/whatsapp
 *
 * @example
 * ```typescript
 * const infobipProvider: WhatsappProviderInfobip = {
 *   type: 'infobip',
 *   baseUrl: 'https://api.infobip.com',
 *   apiKey: 'your-api-key-here'
 * };
 * ```
 */
export interface WhatsappProviderInfobip {
  type: 'infobip'

  /**
   * Infobip API base URL.
   *
   * Common values:
   * - Global: https://api.infobip.com
   * - EU: https://api.infobip.com
   * - US: https://api.infobip.com
   *
   * May vary for dedicated instances or regional deployments.
   */
  baseUrl: string

  /**
   * Infobip API key.
   *
   * Obtain from Infobip portal under API Keys section.
   * Keep this secret and never commit to version control.
   */
  apiKey: string
}

/**
 * Union type of all WhatsApp provider configurations.
 *
 * Use this type when accepting any WhatsApp provider configuration.
 *
 * @example
 * ```typescript
 * function setupWhatsappProvider(provider: WhatsappProvider) {
 *   switch (provider.type) {
 *     case 'infobip':
 *       // Configure Infobip
 *       break;
 *     case 'custom':
 *       // Configure custom provider
 *       break;
 *     case 'logger':
 *       // Configure logger
 *       break;
 *   }
 * }
 * ```
 */
export type WhatsappProvider =
  | WhatsappProviderLogger
  | WhatsappProviderCustom
  | WhatsappProviderInfobip

/** @deprecated Use WhatsappProvider instead */
export type WhatsappProviderType = WhatsappProvider
