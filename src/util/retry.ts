/**
 * Retry utility module with exponential backoff
 * Provides configurable retry logic for HTTP requests and other async operations
 */

/**
 * Default HTTP status codes that should trigger a retry
 * - 408: Request Timeout
 * - 429: Too Many Requests
 * - 500: Internal Server Error
 * - 502: Bad Gateway
 * - 503: Service Unavailable
 * - 504: Gateway Timeout
 */
export const DEFAULT_RETRYABLE_STATUS_CODES: readonly number[] = [408, 429, 500, 502, 503, 504]

/**
 * Default retry configuration values
 */
export const DEFAULT_RETRY_OPTIONS = {
  /** Maximum number of retry attempts (0 means no retries) */
  maxRetries: 3,
  /** Base delay in milliseconds between retries */
  baseDelay: 1000,
  /** Maximum delay in milliseconds between retries */
  maxDelay: 30000,
  /** Whether to add random jitter to delays */
  jitter: true,
  /** Maximum jitter in milliseconds to add to delays */
  maxJitter: 1000,
} as const

/**
 * Information about a retry attempt, passed to callbacks
 */
export interface RetryAttemptInfo {
  /** The current attempt number (1-based) */
  attempt: number
  /** The error that triggered this retry */
  error: Error
  /** The delay in milliseconds before this retry attempt */
  delay: number
}

/**
 * Context provided to the shouldRetry callback for custom retry decisions
 */
export interface ShouldRetryContext {
  /** The current attempt number (1-based) */
  attempt: number
  /** The error that occurred */
  error: Error
  /** HTTP status code if available */
  statusCode?: number
}

/**
 * Configuration options for retry behavior
 *
 * @example
 * ```typescript
 * // Basic usage with defaults
 * const options: RetryOptions = {
 *   maxRetries: 3
 * }
 *
 * // Custom configuration
 * const options: RetryOptions = {
 *   maxRetries: 5,
 *   baseDelay: 500,
 *   maxDelay: 10000,
 *   retryableStatusCodes: [429, 503],
 *   jitter: true,
 *   maxJitter: 500,
 *   shouldRetry: ({ error, statusCode }) => {
 *     // Custom logic to determine if we should retry
 *     return statusCode === 429 || error.message.includes('timeout')
 *   },
 *   onRetry: ({ attempt, error, delay }) => {
 *     console.log(`Retry attempt ${attempt} after ${delay}ms: ${error.message}`)
 *   }
 * }
 * ```
 */
export interface RetryOptions {
  /**
   * Maximum number of retry attempts
   * Set to 0 to disable retries
   * @default 3
   */
  maxRetries?: number

  /**
   * Base delay in milliseconds between retries
   * Used as the starting point for exponential backoff calculation
   * @default 1000
   */
  baseDelay?: number

  /**
   * Maximum delay in milliseconds between retries
   * Caps the exponential backoff to prevent extremely long waits
   * @default 30000
   */
  maxDelay?: number

  /**
   * HTTP status codes that should trigger a retry
   * @default [408, 429, 500, 502, 503, 504]
   */
  retryableStatusCodes?: readonly number[]

  /**
   * Whether to add random jitter to delays
   * Helps prevent thundering herd problem when multiple clients retry simultaneously
   * @default true
   */
  jitter?: boolean

  /**
   * Maximum jitter in milliseconds to add to delays
   * Only used when jitter is enabled
   * @default 1000
   */
  maxJitter?: number

  /**
   * Custom callback to determine if a retry should be attempted
   * If provided, this takes precedence over retryableStatusCodes for the decision
   * Return true to retry, false to stop retrying
   */
  shouldRetry?: (context: ShouldRetryContext) => boolean

  /**
   * Callback fired before each retry attempt
   * Useful for logging, metrics, and debugging
   */
  onRetry?: (info: RetryAttemptInfo) => void

  /**
   * AbortSignal to cancel retries
   * When aborted, the retry loop will stop and throw an AbortError
   */
  signal?: AbortSignal
}

/**
 * Merges user-provided retry options with defaults
 *
 * @param options - User-provided retry options
 * @returns Complete retry options with all defaults applied
 */
export function getRetryOptionsWithDefaults(options: RetryOptions = {}): Required<
  Omit<RetryOptions, 'shouldRetry' | 'onRetry' | 'signal'>
> & {
  shouldRetry?: RetryOptions['shouldRetry']
  onRetry?: RetryOptions['onRetry']
  signal?: RetryOptions['signal']
} {
  return {
    maxRetries: options.maxRetries ?? DEFAULT_RETRY_OPTIONS.maxRetries,
    baseDelay: options.baseDelay ?? DEFAULT_RETRY_OPTIONS.baseDelay,
    maxDelay: options.maxDelay ?? DEFAULT_RETRY_OPTIONS.maxDelay,
    retryableStatusCodes: options.retryableStatusCodes ?? DEFAULT_RETRYABLE_STATUS_CODES,
    jitter: options.jitter ?? DEFAULT_RETRY_OPTIONS.jitter,
    maxJitter: options.maxJitter ?? DEFAULT_RETRY_OPTIONS.maxJitter,
    shouldRetry: options.shouldRetry,
    onRetry: options.onRetry,
    signal: options.signal,
  }
}

/**
 * Checks if a status code is retryable based on the configured list
 *
 * @param statusCode - HTTP status code to check
 * @param retryableStatusCodes - List of status codes that should trigger a retry
 * @returns true if the status code is in the retryable list
 */
export function isRetryableStatusCode(
  statusCode: number | undefined,
  retryableStatusCodes: readonly number[] = DEFAULT_RETRYABLE_STATUS_CODES
): boolean {
  if (statusCode === undefined) {
    return false
  }
  return retryableStatusCodes.includes(statusCode)
}

/**
 * Options for calculateBackoff function
 */
export interface BackoffOptions {
  /**
   * Base delay in milliseconds
   * @default 1000
   */
  baseDelay?: number

  /**
   * Maximum delay in milliseconds
   * @default 30000
   */
  maxDelay?: number

  /**
   * Whether to add random jitter to the delay
   * @default true
   */
  jitter?: boolean

  /**
   * Maximum jitter in milliseconds to add to the delay
   * @default 1000
   */
  maxJitter?: number
}

/**
 * Calculates the delay for a retry attempt using exponential backoff with optional jitter
 *
 * The formula is: min(maxDelay, baseDelay * 2^attempt) + random jitter
 *
 * Exponential backoff increases wait times between retries to reduce load on failing services.
 * Jitter adds randomization to prevent the "thundering herd" problem where many clients
 * retry simultaneously after a service recovers.
 *
 * @param attempt - The current attempt number (1-based: first retry is attempt 1)
 * @param options - Configuration options for the backoff calculation
 * @returns The calculated delay in milliseconds
 *
 * @example
 * ```typescript
 * // First retry with defaults: ~1000ms base + up to 1000ms jitter
 * calculateBackoff(1) // Returns ~1000-2000ms
 *
 * // Second retry: ~2000ms base + jitter
 * calculateBackoff(2) // Returns ~2000-3000ms
 *
 * // Third retry: ~4000ms base + jitter
 * calculateBackoff(3) // Returns ~4000-5000ms
 *
 * // Without jitter (for predictable testing)
 * calculateBackoff(1, { jitter: false }) // Returns exactly 1000ms
 *
 * // Custom configuration
 * calculateBackoff(2, {
 *   baseDelay: 500,
 *   maxDelay: 10000,
 *   jitter: true,
 *   maxJitter: 200
 * }) // Returns ~1000-1200ms
 * ```
 */
export function calculateBackoff(attempt: number, options: BackoffOptions = {}): number {
  const {
    baseDelay = DEFAULT_RETRY_OPTIONS.baseDelay,
    maxDelay = DEFAULT_RETRY_OPTIONS.maxDelay,
    jitter = DEFAULT_RETRY_OPTIONS.jitter,
    maxJitter = DEFAULT_RETRY_OPTIONS.maxJitter,
  } = options

  // Ensure attempt is at least 1 and calculate exponential delay
  // For attempt 1: baseDelay * 2^0 = baseDelay
  // For attempt 2: baseDelay * 2^1 = 2 * baseDelay
  // For attempt 3: baseDelay * 2^2 = 4 * baseDelay
  const normalizedAttempt = Math.max(1, attempt)
  const exponentialDelay = baseDelay * Math.pow(2, normalizedAttempt - 1)

  // Cap at maxDelay
  const cappedDelay = Math.min(maxDelay, exponentialDelay)

  // Add jitter if enabled
  if (jitter && maxJitter > 0) {
    const jitterAmount = Math.random() * maxJitter
    return cappedDelay + jitterAmount
  }

  return cappedDelay
}
