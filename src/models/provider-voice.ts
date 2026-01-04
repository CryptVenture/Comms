/**
 * Voice call provider configuration types.
 *
 * Supports voice call providers:
 * - Twilio (programmable voice calls)
 * - Custom providers (implement your own send function)
 * - Logger (for development/testing)
 *
 * @module provider-voice
 */

import type { VoiceRequest } from './notification-request'

/**
 * Logger provider for development and testing.
 * Logs voice call requests without actually making calls.
 */
export interface VoiceProviderLogger {
  type: 'logger'
}

/**
 * Custom voice provider with user-defined send function.
 *
 * @example
 * ```typescript
 * const customProvider: VoiceProviderCustom = {
 *   type: 'custom',
 *   id: 'my-custom-voice-provider',
 *   send: async (request) => {
 *     // Custom implementation
 *     return 'call-id-123';
 *   }
 * };
 * ```
 */
export interface VoiceProviderCustom {
  type: 'custom'

  /** Unique identifier for this custom provider */
  id: string

  /**
   * Custom send function implementation.
   *
   * @param request - The voice call request to initiate
   * @returns Promise resolving to the call ID
   */
  send: (request: VoiceRequest) => Promise<string>
}

/**
 * Twilio voice provider configuration.
 *
 * Twilio provides programmable voice calls with support for TwiML,
 * call recording, transcription, and advanced call control features.
 *
 * @see https://www.twilio.com/voice
 * @see https://www.twilio.com/docs/voice/twiml
 *
 * @example
 * ```typescript
 * const twilioProvider: VoiceProviderTwilio = {
 *   type: 'twilio',
 *   accountSid: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
 *   authToken: 'your_auth_token_here'
 * };
 * ```
 */
export interface VoiceProviderTwilio {
  type: 'twilio'

  /**
   * Twilio Account SID.
   * A 34-character string starting with 'AC'.
   * Find this in the Twilio Console.
   */
  accountSid: string

  /**
   * Twilio Auth Token.
   * Used to authenticate API requests.
   * Find this in the Twilio Console (keep it secret).
   */
  authToken: string
}

/**
 * Union type of all voice provider configurations.
 *
 * Use this type when accepting any voice provider configuration.
 *
 * @example
 * ```typescript
 * function setupVoiceProvider(provider: VoiceProvider) {
 *   switch (provider.type) {
 *     case 'twilio':
 *       // Configure Twilio
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
export type VoiceProvider = VoiceProviderLogger | VoiceProviderCustom | VoiceProviderTwilio

/** @deprecated Use VoiceProvider instead */
export type VoiceProviderType = VoiceProvider
