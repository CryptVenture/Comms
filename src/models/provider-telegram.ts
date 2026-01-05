/**
 * Telegram notification provider configuration types.
 *
 * Supports Telegram messaging through:
 * - Telegram Bot API (official bot interface)
 * - Custom providers (implement your own send function)
 * - Logger (for development/testing)
 *
 * @module provider-telegram
 */

import type { TelegramRequest } from './notification-request'

/**
 * Logger provider for development and testing.
 * Logs Telegram message requests without actually sending them.
 */
export interface TelegramProviderLogger {
  type: 'logger'
}

/**
 * Custom Telegram provider with user-defined send function.
 *
 * Use this for advanced Telegram integrations that require custom logic,
 * such as custom message routing, rate limiting, or special formatting.
 *
 * @example
 * ```typescript
 * const customProvider: TelegramProviderCustom = {
 *   type: 'custom',
 *   id: 'my-custom-telegram-provider',
 *   send: async (request) => {
 *     // Custom implementation using Telegram Bot API
 *     return 'message-id-123';
 *   }
 * };
 * ```
 */
export interface TelegramProviderCustom {
  type: 'custom'

  /** Unique identifier for this custom provider */
  id: string

  /**
   * Custom send function implementation.
   *
   * @param request - The Telegram message request to send
   * @returns Promise resolving to the message ID
   */
  send: (request: TelegramRequest) => Promise<string>
}

/**
 * Telegram Bot API provider configuration.
 *
 * Uses the official Telegram Bot API to send messages to users and groups.
 * This is the standard way to send messages through Telegram.
 *
 * Create a bot:
 * 1. Message @BotFather on Telegram
 * 2. Use /newbot command to create a new bot
 * 3. Copy the bot token provided by BotFather
 * 4. Optionally get your chat_id by messaging your bot and checking updates
 *
 * @see https://core.telegram.org/bots/api
 *
 * @example
 * ```typescript
 * // Provider with bot token (chat_id in each request)
 * const telegramProvider: TelegramProviderTelegramBot = {
 *   type: 'telegram-bot',
 *   botToken: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz'
 * };
 *
 * // Provider with default chat_id
 * const telegramProvider: TelegramProviderTelegramBot = {
 *   type: 'telegram-bot',
 *   botToken: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz',
 *   chatId: '-1001234567890'
 * };
 * ```
 */
export interface TelegramProviderTelegramBot {
  type: 'telegram-bot'

  /**
   * Telegram Bot API token.
   *
   * Obtain from @BotFather when creating your bot.
   * Format: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz
   * Keep this secret and never commit to version control.
   */
  botToken: string

  /**
   * Default chat ID for messages.
   *
   * Optional at provider level - can be specified in individual requests
   * to allow dynamic routing to different chats, groups, or channels.
   *
   * Formats:
   * - User chat: numeric ID (e.g., '123456789')
   * - Group: negative numeric ID (e.g., '-1234567890')
   * - Channel: negative ID starting with -100 (e.g., '-1001234567890')
   * - Channel username: @channelname
   */
  chatId?: string
}

/**
 * Union type of all Telegram provider configurations.
 *
 * Use this type when accepting any Telegram provider configuration.
 *
 * @example
 * ```typescript
 * function setupTelegramProvider(provider: TelegramProvider) {
 *   switch (provider.type) {
 *     case 'telegram-bot':
 *       // Configure Telegram Bot API
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
export type TelegramProvider =
  | TelegramProviderLogger
  | TelegramProviderCustom
  | TelegramProviderTelegramBot

/** @deprecated Use TelegramProvider instead */
export type TelegramProviderType = TelegramProvider
