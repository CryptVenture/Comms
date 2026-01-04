/**
 * Slack Webhook Provider
 * Sends messages to Slack via Incoming Webhooks
 *
 * @module providers/slack/slack
 * @see https://api.slack.com/messaging/webhooks
 */

import fetch from '../../util/request'
import { ProviderError } from '../../types/errors'
import type { SlackRequest } from '../../models/notification-request'

/**
 * Slack provider configuration
 */
export interface SlackConfig {
  webhookUrl: string
}

/**
 * Slack Webhook Provider
 *
 * Implements Slack messaging using Incoming Webhooks.
 * Supports rich message formatting with attachments, actions, and more.
 *
 * @example
 * ```typescript
 * const provider = new SlackProvider({
 *   webhookUrl: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX'
 * })
 *
 * await provider.send({
 *   text: 'Hello from Notif.me!',
 *   attachments: [{
 *     color: '#36a64f',
 *     title: 'Notification',
 *     text: 'This is a test message'
 *   }]
 * })
 * ```
 */
export default class SlackProvider {
  readonly id: string = 'slack-provider'
  private readonly webhookUrl: string

  /**
   * Creates a new Slack webhook provider
   *
   * @param config - Slack configuration
   * @throws {ProviderError} If webhookUrl is missing
   */
  constructor(config: SlackConfig) {
    if (!config.webhookUrl) {
      throw new ProviderError(
        'Slack webhookUrl is required',
        this.id,
        'slack',
        'MISSING_WEBHOOK_URL'
      )
    }

    this.webhookUrl = config.webhookUrl
  }

  /**
   * Sends a message to Slack
   *
   * @param request - Slack message request
   * @returns Empty string (Slack API only returns 'ok')
   * @throws {ProviderError} If the API request fails
   *
   * @example
   * ```typescript
   * await provider.send({
   *   text: 'Deployment successful!',
   *   attachments: [{
   *     color: 'good',
   *     fields: [
   *       { title: 'Environment', value: 'Production', short: true },
   *       { title: 'Version', value: 'v1.2.3', short: true }
   *     ]
   *   }]
   * })
   *
   * // With custom webhook URL
   * await provider.send({
   *   webhookUrl: 'https://hooks.slack.com/services/...',
   *   text: 'Custom channel message'
   * })
   * ```
   */
  async send(request: SlackRequest): Promise<string> {
    try {
      // Apply customization if provided
      const customizedRequest = request.customize
        ? await request.customize(this.id, request)
        : request

      const { webhookUrl, ...rest } = customizedRequest

      // Validate required fields
      if (!rest.text) {
        throw new ProviderError(
          'Slack request must include text',
          this.id,
          'slack',
          'INVALID_REQUEST'
        )
      }

      // Use custom webhook URL if provided, otherwise use configured URL
      const targetWebhookUrl = webhookUrl || this.webhookUrl

      // Make API request
      const response = await fetch(targetWebhookUrl, {
        method: 'POST',
        body: JSON.stringify(rest),
      })

      if (response.ok) {
        // Slack API only returns 'ok'
        return ''
      }

      // Handle error response
      const responseText = await response.text()
      throw new ProviderError(
        `Slack webhook error: ${responseText}`,
        this.id,
        'slack',
        'API_ERROR',
        { status: response.status, body: responseText }
      )
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error
      }

      throw new ProviderError(
        `Failed to send Slack message: ${error instanceof Error ? error.message : String(error)}`,
        this.id,
        'slack',
        'SEND_FAILED',
        error
      )
    }
  }
}
