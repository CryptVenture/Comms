/**
 * Slack Notification Catcher Provider
 * Redirects Slack messages to local SMTP server for testing
 *
 * @module providers/slack/notificationCatcher
 */

import NotificationCatcherProvider from '../notificationCatcherProvider'
import { ProviderError } from '../../types/errors'
import type { SlackRequest } from '../../models/notification-request'

/**
 * Slack Notification Catcher Provider
 *
 * Captures Slack message requests and sends them to a local SMTP server
 * for testing and development purposes. This is useful for testing
 * Slack integrations without sending actual messages to Slack.
 *
 * @example
 * ```typescript
 * const provider = new SlackCatcherProvider('slack')
 *
 * await provider.send({
 *   text: 'Hello from Slack!',
 *   attachments: [...]
 * })
 * // Message details sent to localhost:1025 as email
 * ```
 */
export default class SlackCatcherProvider extends NotificationCatcherProvider {
  /**
   * Sends Slack message to notification catcher
   *
   * @param request - Slack message request
   * @returns Message ID from SMTP server
   * @throws {ProviderError} If sending to catcher fails
   *
   * @example
   * ```typescript
   * const messageId = await provider.send({
   *   text: 'Deployment notification',
   *   attachments: [{
   *     color: 'good',
   *     title: 'Production Deploy',
   *     text: 'Version 1.2.3 deployed successfully'
   *   }]
   * })
   * ```
   */
  async send(request: SlackRequest): Promise<string> {
    try {
      // Apply customization if provided
      const customizedRequest = request.customize
        ? await request.customize(this.id, request)
        : request

      const { text } = customizedRequest

      // Validate required fields
      if (!text) {
        throw new ProviderError(
          'Slack request must include text',
          this.id,
          'slack',
          'INVALID_REQUEST'
        )
      }

      // Truncate text for subject line
      const subject = `${text.substring(0, 20)}${text.length > 20 ? '...' : ''}`

      // Send to notification catcher via SMTP
      await this.sendToCatcher({
        to: 'public.channel@slack',
        from: '-',
        subject,
        text,
        headers: {
          'X-type': 'slack',
          'X-to': '[slack public channel]',
        },
      })

      return ''
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error
      }

      throw new ProviderError(
        `Failed to send to notification catcher: ${error instanceof Error ? error.message : String(error)}`,
        this.id,
        'slack',
        'CATCHER_SEND_FAILED',
        error
      )
    }
  }
}
