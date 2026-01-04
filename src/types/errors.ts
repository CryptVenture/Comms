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
 */
export class ConfigurationError extends CommsError {
  constructor(message: string, code?: string, cause?: unknown) {
    super(message, code, cause)
    this.name = 'ConfigurationError'
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
