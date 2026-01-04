/**
 * Slack notification provider configuration types.
 *
 * Supports Slack messaging through:
 * - Webhook (incoming webhooks for simple message posting)
 * - Custom providers (implement your own send function)
 * - Logger (for development/testing)
 *
 * @module provider-slack
 */

import type { SlackRequest } from './notification-request'

/**
 * Logger provider for development and testing.
 * Logs Slack message requests without actually sending them.
 */
export interface SlackProviderLogger {
  type: 'logger'
}

/**
 * Custom Slack provider with user-defined send function.
 *
 * Use this for advanced Slack integrations that require custom logic,
 * such as OAuth-based apps, bot interactions, or custom message routing.
 *
 * @example
 * ```typescript
 * const customProvider: SlackProviderCustom = {
 *   type: 'custom',
 *   id: 'my-custom-slack-provider',
 *   send: async (request) => {
 *     // Custom implementation using Slack Web API
 *     return 'message-timestamp-123';
 *   }
 * };
 * ```
 */
export interface SlackProviderCustom {
  type: 'custom'

  /** Unique identifier for this custom provider */
  id: string

  /**
   * Custom send function implementation.
   *
   * @param request - The Slack message request to send
   * @returns Promise resolving to the message timestamp or ID
   */
  send: (request: SlackRequest) => Promise<string>
}

/**
 * Slack webhook provider configuration.
 *
 * Uses Slack Incoming Webhooks to post messages to channels.
 * This is the simplest way to send messages to Slack.
 *
 * Create a webhook:
 * 1. Go to https://api.slack.com/apps
 * 2. Create a new app or select an existing one
 * 3. Enable "Incoming Webhooks"
 * 4. Create a new webhook for a channel
 * 5. Copy the webhook URL
 *
 * @see https://api.slack.com/messaging/webhooks
 *
 * @example
 * ```typescript
 * // Provider-level webhook (used for all messages)
 * const slackProvider: SlackProviderWebhook = {
 *   type: 'webhook',
 *   webhookUrl: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXX'
 * };
 *
 * // Provider without webhook (requires webhookUrl in each request)
 * const slackProvider: SlackProviderWebhook = {
 *   type: 'webhook'
 * };
 * ```
 */
export interface SlackProviderWebhook {
  type: 'webhook'

  /**
   * Slack incoming webhook URL.
   *
   * Optional at provider level - can be specified in individual requests
   * to allow dynamic routing to different channels or workspaces.
   *
   * Format: https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXX
   */
  webhookUrl?: string
}

/**
 * Union type of all Slack provider configurations.
 *
 * Use this type when accepting any Slack provider configuration.
 *
 * @example
 * ```typescript
 * function setupSlackProvider(provider: SlackProvider) {
 *   switch (provider.type) {
 *     case 'webhook':
 *       // Configure webhook
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
export type SlackProvider = SlackProviderLogger | SlackProviderCustom | SlackProviderWebhook

/** @deprecated Use SlackProvider instead */
export type SlackProviderType = SlackProvider
