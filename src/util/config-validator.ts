/**
 * Configuration validation utility for WebVentures Comms SDK
 *
 * Validates SDK configuration at construction time, providing clear error messages
 * for missing or invalid provider configurations.
 */

import { ConfigurationError } from '../types/errors'
import type { ValidationIssue, ValidationResult } from '../types/errors'
import type { CommsSdkConfig, ChannelConfig, ProviderConfig } from '../types/config'
import type { ChannelType } from '../types'

// Re-export validation types for convenience
export type { ValidationIssue, ValidationResult }

/**
 * Provider configuration requirements
 *
 * Maps provider types to their required fields.
 * Some providers have conditional requirements (e.g., APN requires
 * either token auth, cert auth, or pfx).
 */
export interface ProviderRequirement {
  /** List of required field names */
  requiredFields?: string[]
  /**
   * Alternative field sets - at least one set of fields must be present.
   * Each inner array represents a valid configuration.
   */
  requiredAlternatives?: string[][]
  /** Human-readable description of requirements for error messages */
  description: string
}

/**
 * Registry of provider configuration requirements by channel and type
 */
export const PROVIDER_REQUIREMENTS: Record<ChannelType, Record<string, ProviderRequirement>> = {
  email: {
    sendgrid: {
      requiredFields: ['apiKey'],
      description: 'SendGrid requires apiKey',
    },
    mailgun: {
      requiredFields: ['apiKey', 'domainName'],
      description: 'Mailgun requires apiKey and domainName',
    },
    mandrill: {
      requiredFields: ['apiKey'],
      description: 'Mandrill requires apiKey',
    },
    postmark: {
      requiredFields: ['serverToken'],
      description: 'Postmark requires serverToken',
    },
    sparkpost: {
      requiredFields: ['apiKey'],
      description: 'SparkPost requires apiKey',
    },
    ses: {
      requiredFields: ['region'],
      description: 'AWS SES requires region',
    },
    smtp: {
      // SMTP has all optional config with nodemailer defaults
      description: 'SMTP accepts optional configuration',
    },
    sendmail: {
      // Sendmail has all optional config
      description: 'Sendmail accepts optional configuration',
    },
  },
  sms: {
    twilio: {
      requiredFields: ['accountSid', 'authToken'],
      description: 'Twilio requires accountSid and authToken',
    },
    nexmo: {
      requiredFields: ['apiKey', 'apiSecret'],
      description: 'Nexmo requires apiKey and apiSecret',
    },
    plivo: {
      requiredFields: ['authId', 'authToken'],
      description: 'Plivo requires authId and authToken',
    },
    infobip: {
      requiredFields: ['username', 'password'],
      description: 'Infobip requires username and password',
    },
    clickatell: {
      requiredFields: ['apiKey'],
      description: 'Clickatell requires apiKey',
    },
    callr: {
      requiredFields: ['login', 'password'],
      description: 'Callr requires login and password',
    },
    ovh: {
      requiredFields: ['appKey', 'appSecret', 'consumerKey', 'account', 'host'],
      description: 'OVH requires appKey, appSecret, consumerKey, account, and host',
    },
    seven: {
      requiredFields: ['apiKey'],
      description: 'Seven requires apiKey',
    },
    '46elks': {
      requiredFields: ['apiUsername', 'apiPassword'],
      description: '46elks requires apiUsername and apiPassword',
    },
  },
  push: {
    fcm: {
      requiredFields: ['id'],
      description: 'FCM requires id (server key)',
    },
    apn: {
      requiredAlternatives: [
        ['token.key', 'token.keyId', 'token.teamId'],
        ['cert', 'key'],
        ['pfx'],
      ],
      description:
        'APN requires either token authentication (key, keyId, teamId), certificate authentication (cert, key), or pfx file',
    },
    adm: {
      requiredFields: ['clientId', 'clientSecret'],
      description: 'ADM requires clientId and clientSecret',
    },
    wns: {
      requiredFields: ['clientId', 'clientSecret', 'notificationMethod'],
      description: 'WNS requires clientId, clientSecret, and notificationMethod',
    },
  },
  voice: {
    twilio: {
      requiredFields: ['accountSid', 'authToken'],
      description: 'Twilio Voice requires accountSid and authToken',
    },
  },
  webpush: {
    gcm: {
      requiredAlternatives: [
        ['gcmAPIKey'],
        ['vapidDetails.subject', 'vapidDetails.publicKey', 'vapidDetails.privateKey'],
      ],
      description: 'GCM requires either gcmAPIKey or vapidDetails (subject, publicKey, privateKey)',
    },
  },
  slack: {
    slack: {
      requiredFields: ['webhookUrl'],
      description: 'Slack requires webhookUrl',
    },
  },
  whatsapp: {
    infobip: {
      requiredFields: ['baseUrl', 'apiKey'],
      description: 'WhatsApp Infobip requires baseUrl and apiKey',
    },
  },
  telegram: {
    telegram: {
      requiredFields: ['botToken'],
      description: 'Telegram requires botToken',
    },
  },
}

/**
 * Get a nested property value from an object using dot notation
 *
 * @param obj - The object to get the property from
 * @param path - The property path (e.g., 'token.key')
 * @returns The value at the path, or undefined if not found
 *
 * @example
 * ```typescript
 * const obj = { token: { key: 'secret' } }
 * getNestedValue(obj, 'token.key') // 'secret'
 * getNestedValue(obj, 'token.missing') // undefined
 * ```
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = obj

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    current = (current as Record<string, unknown>)[part]
  }

  return current
}

/**
 * Check if a value is considered present (not null, undefined, or empty string)
 *
 * @param value - The value to check
 * @returns True if the value is present
 */
function isPresent(value: unknown): boolean {
  return value !== null && value !== undefined && value !== ''
}

/**
 * Configuration Validator
 *
 * Validates SDK configuration at construction time, providing clear error messages
 * for missing or invalid provider configurations.
 *
 * @example
 * ```typescript
 * const validator = new ConfigValidator()
 *
 * // Validate entire SDK configuration
 * const result = validator.validate({
 *   channels: {
 *     email: {
 *       providers: [{ type: 'sendgrid' }] // Missing apiKey
 *     }
 *   }
 * })
 *
 * if (!result.valid) {
 *   console.log(result.issues)
 *   // [{ channel: 'email', providerType: 'sendgrid', missingFields: ['apiKey'], ... }]
 * }
 *
 * // Validate and throw if invalid
 * validator.validateOrThrow(config)
 * ```
 */
export default class ConfigValidator {
  /**
   * Validate the entire SDK configuration
   *
   * @param config - The SDK configuration to validate
   * @returns Validation result with any issues found
   */
  validate(config: CommsSdkConfig): ValidationResult {
    const issues: ValidationIssue[] = []

    if (!config.channels) {
      return { valid: true, issues: [] }
    }

    // Validate each channel
    for (const [channel, channelConfig] of Object.entries(config.channels)) {
      if (!channelConfig) continue

      const channelIssues = this.validateChannel(
        channel as ChannelType,
        channelConfig as ChannelConfig
      )
      issues.push(...channelIssues)
    }

    return {
      valid: issues.length === 0,
      issues,
    }
  }

  /**
   * Validate a single channel configuration
   *
   * @param channel - The channel type (e.g., 'email', 'sms')
   * @param config - The channel configuration
   * @returns List of validation issues for this channel
   */
  validateChannel(channel: ChannelType, config: ChannelConfig): ValidationIssue[] {
    const issues: ValidationIssue[] = []

    if (!config.providers || !Array.isArray(config.providers)) {
      return issues
    }

    for (const provider of config.providers) {
      const providerIssues = this.validateProvider(channel, provider)
      issues.push(...providerIssues)
    }

    return issues
  }

  /**
   * Validate a single provider configuration
   *
   * @param channel - The channel type
   * @param config - The provider configuration
   * @returns List of validation issues for this provider
   */
  validateProvider(channel: ChannelType, config: ProviderConfig): ValidationIssue[] {
    const issues: ValidationIssue[] = []

    if (!config.type) {
      issues.push({
        channel,
        providerType: 'unknown',
        missingFields: ['type'],
        message: `Provider in ${channel} channel is missing required 'type' field`,
      })
      return issues
    }

    const providerType = config.type

    // Skip validation for special provider types
    if (
      providerType === 'logger' ||
      providerType === 'notificationcatcher' ||
      providerType === 'custom'
    ) {
      return issues
    }

    // Get requirements for this provider
    const channelRequirements = PROVIDER_REQUIREMENTS[channel]
    if (!channelRequirements) {
      // Unknown channel, skip validation
      return issues
    }

    const requirements = channelRequirements[providerType]
    if (!requirements) {
      // Unknown provider type for this channel, skip validation
      // The provider factory will handle this error
      return issues
    }

    // Check required fields
    if (requirements.requiredFields) {
      const missingFields = requirements.requiredFields.filter(
        (field) => !isPresent(getNestedValue(config as Record<string, unknown>, field))
      )

      if (missingFields.length > 0) {
        issues.push({
          channel,
          providerType,
          missingFields,
          message: `${channel}/${providerType}: ${requirements.description}. Missing: ${missingFields.join(', ')}`,
        })
      }
    }

    // Check alternative field sets
    if (requirements.requiredAlternatives) {
      const hasValidAlternative = requirements.requiredAlternatives.some((alternative) =>
        alternative.every((field) =>
          isPresent(getNestedValue(config as Record<string, unknown>, field))
        )
      )

      if (!hasValidAlternative) {
        // Find which alternatives are partially filled to give a helpful message
        const missingFields: string[] = []
        for (const alternative of requirements.requiredAlternatives) {
          const missing = alternative.filter(
            (field) => !isPresent(getNestedValue(config as Record<string, unknown>, field))
          )
          if (missing.length < alternative.length) {
            // Partially filled - show what's missing
            missingFields.push(...missing)
          }
        }

        issues.push({
          channel,
          providerType,
          missingFields:
            missingFields.length > 0 ? missingFields : ['(one of the required alternatives)'],
          message: `${channel}/${providerType}: ${requirements.description}`,
        })
      }
    }

    return issues
  }

  /**
   * Validate the configuration and throw if invalid
   *
   * @param config - The SDK configuration to validate
   * @throws {ConfigurationError} If the configuration is invalid
   *
   * @example
   * ```typescript
   * try {
   *   validator.validateOrThrow(config)
   * } catch (error) {
   *   if (error instanceof ConfigurationError) {
   *     console.error('Invalid configuration:', error.message)
   *   }
   * }
   * ```
   */
  validateOrThrow(config: CommsSdkConfig): void {
    const result = this.validate(config)

    if (!result.valid) {
      const message = this.formatErrorMessage(result.issues)
      throw new ConfigurationError(message, 'INVALID_CONFIG', undefined, result.issues)
    }
  }

  /**
   * Format validation issues into a human-readable error message
   *
   * @param issues - List of validation issues
   * @returns Formatted error message
   */
  formatErrorMessage(issues: ValidationIssue[]): string {
    if (issues.length === 0) {
      return 'Configuration is valid'
    }

    const firstIssue = issues[0]
    if (issues.length === 1 && firstIssue) {
      return `Invalid configuration: ${firstIssue.message}`
    }

    const issueMessages = issues.map((issue, index) => `  ${index + 1}. ${issue.message}`)
    return `Invalid configuration with ${issues.length} issues:\n${issueMessages.join('\n')}`
  }
}

/**
 * Create a new ConfigValidator instance
 *
 * @returns A new ConfigValidator instance
 *
 * @example
 * ```typescript
 * import { createConfigValidator } from './util/config-validator'
 *
 * const validator = createConfigValidator()
 * const result = validator.validate(config)
 * ```
 */
export function createConfigValidator(): ConfigValidator {
  return new ConfigValidator()
}
