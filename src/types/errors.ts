/**
 * Error types for WebVentures Comms SDK
 */

import type { ChannelType } from './index'

/**
 * Base error class for all SDK errors
 */
export class CommsError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public override readonly cause?: unknown
  ) {
    super(message)
    this.name = 'CommsError'
    Object.setPrototypeOf(this, CommsError.prototype)
  }
}

/**
 * Provider-specific error
 */
export class ProviderError extends CommsError {
  constructor(
    message: string,
    public readonly providerId: string,
    public readonly channel?: ChannelType,
    code?: string,
    cause?: unknown
  ) {
    super(message, code, cause)
    this.name = 'ProviderError'
    Object.setPrototypeOf(this, ProviderError.prototype)
  }
}

/**
 * Configuration error
 *
 * Thrown when SDK configuration is invalid. Provides detailed context about
 * which channels, providers, and fields have issues.
 *
 * @example
 * ```typescript
 * try {
 *   const sdk = new CommsSdk({ channels: { email: { providers: [{ type: 'sendgrid' }] } } })
 * } catch (error) {
 *   if (error instanceof ConfigurationError) {
 *     console.log('Channel:', error.channel)       // 'email'
 *     console.log('Provider:', error.providerType) // 'sendgrid'
 *     console.log('Missing:', error.missingFields) // ['apiKey']
 *     console.log('All issues:', error.issues)     // Full list of ValidationIssue
 *   }
 * }
 * ```
 */
export class ConfigurationError extends CommsError {
  /**
   * The channel where the first issue was found (convenience property)
   */
  public readonly channel?: string

  /**
   * The provider type of the first issue (convenience property)
   */
  public readonly providerType?: string

  /**
   * Missing fields from the first issue (convenience property)
   */
  public readonly missingFields?: string[]

  /**
   * All validation issues found during configuration validation
   */
  public readonly issues?: ValidationIssue[]

  constructor(message: string, code?: string, cause?: unknown, issues?: ValidationIssue[]) {
    super(message, code, cause)
    this.name = 'ConfigurationError'
    this.issues = issues

    // Set convenience properties from the first issue
    const firstIssue = issues?.[0]
    if (firstIssue) {
      this.channel = firstIssue.channel
      this.providerType = firstIssue.providerType
      this.missingFields = firstIssue.missingFields
    }

    Object.setPrototypeOf(this, ConfigurationError.prototype)
  }
}

/**
 * Validation error
 */
export class ValidationError extends CommsError {
  constructor(
    message: string,
    public readonly field?: string,
    code?: string,
    cause?: unknown
  ) {
    super(message, code, cause)
    this.name = 'ValidationError'
    Object.setPrototypeOf(this, ValidationError.prototype)
  }
}

/**
 * Network/HTTP error
 */
export class NetworkError extends CommsError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly response?: unknown,
    code?: string,
    cause?: unknown
  ) {
    super(message, code, cause)
    this.name = 'NetworkError'
    Object.setPrototypeOf(this, NetworkError.prototype)
  }
}

/**
 * Type guard for CommsError
 */
export function isCommsError(error: unknown): error is CommsError {
  return error instanceof CommsError
}

/**
 * Type guard for ProviderError
 */
export function isProviderError(error: unknown): error is ProviderError {
  return error instanceof ProviderError
}

/**
 * Represents a single validation issue found during configuration validation
 */
export interface ValidationIssue {
  /** The channel where the issue was found (e.g., 'email', 'sms') */
  channel: string
  /** The provider type (e.g., 'sendgrid', 'twilio') */
  providerType: string
  /** The specific field(s) that are missing or invalid */
  missingFields: string[]
  /** A human-readable description of the issue */
  message: string
}

/**
 * Represents the result of configuration validation
 */
export interface ValidationResult {
  /** Whether the configuration is valid */
  valid: boolean
  /** List of validation issues found */
  issues: ValidationIssue[]
}
