/**
 * Telegram Bot API Provider
 * Sends messages via Telegram Bot API
 *
 * @module providers/telegram/telegram
 * @see https://core.telegram.org/bots/api#sendmessage
 */

import fetch from '../../util/request'
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
 * Telegram API response structure
 */
interface TelegramApiResponse {
  ok: boolean
  result?: {
    message_id: number
    chat: { id: number }
    date: number
    text?: string
  }
  description?: string
  error_code?: number
}

/**
 * Telegram Bot API Provider
 *
 * Implements message sending via the Telegram Bot API.
 * Supports text messages with various formatting options.
 *
 * @example
 * ```typescript
 * const provider = new TelegramProvider({
 *   botToken: '123456789:ABCdefGHIjklMNOpqrstUVWxyz'
 * })
 *
 * await provider.send({
 *   chatId: '-1001234567890',
 *   text: 'Hello from Telegram!',
 *   parseMode: 'HTML'
 * })
 * ```
 */
export default class TelegramProvider {
  readonly id: string = 'telegram-bot-provider'
  private readonly botToken: string
  private readonly defaultChatId?: string
  private readonly apiBaseUrl: string = 'https://api.telegram.org'

  /**
   * Creates a new Telegram Bot API provider
   *
   * @param config - Telegram configuration
   * @throws {ProviderError} If botToken is missing
   */
  constructor(config: TelegramConfig) {
    if (!config.botToken) {
      throw new ProviderError(
        'Telegram botToken is required',
        this.id,
        'telegram',
        'MISSING_BOT_TOKEN'
      )
    }

    this.botToken = config.botToken
    this.defaultChatId = config.chatId
  }

  /**
   * Sends a message via Telegram Bot API
   *
   * @param request - Telegram message request
   * @returns Message ID from Telegram
   * @throws {ProviderError} If the API request fails
   *
   * @example
   * ```typescript
   * // Simple text message
   * await provider.send({
   *   chatId: '123456789',
   *   text: 'Hello!'
   * })
   *
   * // Message with HTML formatting
   * await provider.send({
   *   chatId: '-1001234567890',
   *   text: '<b>Bold</b> and <i>italic</i>',
   *   parseMode: 'HTML'
   * })
   *
   * // Silent message as a reply
   * await provider.send({
   *   chatId: '-1001234567890',
   *   text: 'This is a reply',
   *   disableNotification: true,
   *   replyToMessageId: 42
   * })
   * ```
   */
  async send(request: TelegramRequest): Promise<string> {
    try {
      // Apply customization if provided
      const customizedRequest = request.customize
        ? await request.customize(this.id, request)
        : request

      // Determine chat ID (use default if not provided in request)
      const chatId = customizedRequest.chatId || this.defaultChatId

      // Validate required fields
      if (!chatId) {
        throw new ProviderError(
          'Telegram request must include chatId',
          this.id,
          'telegram',
          'INVALID_REQUEST'
        )
      }

      if (!customizedRequest.text) {
        throw new ProviderError(
          'Telegram request must include text',
          this.id,
          'telegram',
          'INVALID_REQUEST'
        )
      }

      // Build request body for Telegram API
      const body: Record<string, unknown> = {
        chat_id: chatId,
        text: customizedRequest.text,
      }

      // Add optional parameters
      if (customizedRequest.parseMode) {
        body.parse_mode = customizedRequest.parseMode
      }

      if (customizedRequest.disableNotification !== undefined) {
        body.disable_notification = customizedRequest.disableNotification
      }

      if (customizedRequest.replyToMessageId !== undefined) {
        body.reply_to_message_id = customizedRequest.replyToMessageId
      }

      // Build API URL
      const apiUrl = `${this.apiBaseUrl}/bot${this.botToken}/sendMessage`

      // Make API request
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      // Parse response
      const responseData = (await response.json()) as TelegramApiResponse

      if (responseData.ok && responseData.result) {
        // Return message ID as string
        return String(responseData.result.message_id)
      }

      // Handle error response
      throw new ProviderError(
        `Telegram API error: ${responseData.description || 'Unknown error'}`,
        this.id,
        'telegram',
        'API_ERROR',
        {
          status: response.status,
          errorCode: responseData.error_code,
          description: responseData.description,
        }
      )
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error
      }

      throw new ProviderError(
        `Failed to send Telegram message: ${error instanceof Error ? error.message : String(error)}`,
        this.id,
        'telegram',
        'SEND_FAILED',
        error
      )
    }
  }
}
