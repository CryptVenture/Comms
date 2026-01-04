/**
 * Telegram Bot API Provider
 * Sends messages via Telegram Bot API
 *
 * @module providers/telegram/telegram
 */

import { ProviderError } from '../../types/errors'
import type { TelegramRequest } from '../../models/notification-request'

/**
 * Telegram Bot API provider configuration
 */
export interface TelegramConfig {
  /**
   * Telegram Bot API token
   * Obtain from @BotFather when creating your bot
   */
  botToken: string

  /**
   * Default chat ID for messages
   * Can be overridden in individual requests
   */
  chatId?: string
}

/**
 * Telegram Provider
 *
 * Sends messages via the Telegram Bot API.
 * Implementation to be completed in subtask 2.2.
 */
export default class TelegramProvider {
  readonly id = 'telegram-bot-provider'
  private readonly botToken: string
  private readonly defaultChatId?: string

  constructor(config: TelegramConfig) {
    if (!config.botToken) {
      throw new ProviderError(
        'Telegram provider requires botToken',
        this.id,
        'telegram',
        'INVALID_CONFIG'
      )
    }
    this.botToken = config.botToken
    this.defaultChatId = config.chatId
  }

  /**
   * Send a message via Telegram Bot API
   * @param request - Telegram message request
   * @returns Message ID from Telegram
   */
  async send(_request: TelegramRequest): Promise<string> {
    // Stub implementation - will be completed in subtask 2.2
    // These will be used in the full implementation
    void this.botToken
    void this.defaultChatId
    throw new ProviderError(
      'TelegramProvider.send() not yet implemented',
      this.id,
      'telegram',
      'NOT_IMPLEMENTED'
    )
  }
}
