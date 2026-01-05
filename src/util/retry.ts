/**
 * Retry Utility Module
 *
 * Provides configurable retry logic with exponential backoff for HTTP requests
 * and other async operations. This module offers a flexible, production-ready
 * retry mechanism that helps handle transient failures gracefully.
 *
 * Key features:
 * - Exponential backoff with configurable base and max delays
 * - Optional jitter to prevent thundering herd problems
 * - AbortSignal support for cancellation
 * - Custom retry conditions via shouldRetry callback
 * - Observability through onRetry callback
 * - Works with any async function, not just HTTP requests
 *
 * @module util/retry
 *
 * @example
 * ```typescript
 * import { withRetry, request } from '@webventures/comms'
 *
 * // Basic retry for any async function
 * const result = await withRetry(
 *   () => fetchDataFromAPI(),
 *   { maxRetries: 3 }
 * )
 *
 * // HTTP request with built-in retry support
 * const response = await request('https://api.example.com/data', {
 *   retry: { maxRetries: 3, baseDelay: 1000 }
 * })
 *
 * // Advanced usage with all options
 * const result = await withRetry(
 *   () => callExternalService(),
 *   {
 *     maxRetries: 5,
 *     baseDelay: 500,
 *     maxDelay: 10000,
 *     jitter: true,
 *     maxJitter: 500,
 *     retryableStatusCodes: [429, 500, 502, 503, 504],
 *     shouldRetry: ({ error, statusCode, attempt }) => {
 *       // Custom logic: only retry rate limits and server errors
 *       return statusCode === 429 || (statusCode !== undefined && statusCode >= 500)
 *     },
 *     onRetry: ({ attempt, error, delay }) => {
 *       console.log(`Retry ${attempt} after ${delay}ms: ${error.message}`)
 *     },
 *     signal: AbortSignal.timeout(30000)
 *   }
 * )
 * ```
 */

/**
 * Default HTTP status codes that should trigger a retry
 *
 * These status codes indicate temporary failures that typically succeed on retry:
 * - 408: Request Timeout - The server timed out waiting for the request
 * - 429: Too Many Requests - Rate limiting; retry after backing off
 * - 500: Internal Server Error - Generic server error, may be transient
 * - 502: Bad Gateway - Upstream server error, often transient
 * - 503: Service Unavailable - Server overloaded or in maintenance
 * - 504: Gateway Timeout - Upstream server timeout
 *
 * Status codes NOT included (should not be retried):
 * - 4xx (except 408, 429): Client errors that won't change on retry
 * - 501: Not Implemented - Server doesn't support the functionality
 *
 * @example
 * ```typescript
 * // Check if a status code is in the default list
 * import { DEFAULT_RETRYABLE_STATUS_CODES, isRetryableStatusCode } from '@webventures/comms'
 *
 * console.log(DEFAULT_RETRYABLE_STATUS_CODES)
 * // [408, 429, 500, 502, 503, 504]
 *
 * isRetryableStatusCode(429)  // true
 * isRetryableStatusCode(404)  // false
 *
 * // Use as base for custom status codes
 * const customCodes = [...DEFAULT_RETRYABLE_STATUS_CODES, 418] // Add I'm a teapot!
 * ```
 */
export const DEFAULT_RETRYABLE_STATUS_CODES: readonly number[] = [408, 429, 500, 502, 503, 504]

/**
 * Default retry configuration values
 *
 * These defaults provide a reasonable balance between recovery from transient
 * failures and avoiding excessive delays or retries.
 *
 * With defaults, retry delays are approximately:
 * - Retry 1: 1000ms + jitter (0-1000ms) = 1-2 seconds
 * - Retry 2: 2000ms + jitter = 2-3 seconds
 * - Retry 3: 4000ms + jitter = 4-5 seconds
 *
 * @example
 * ```typescript
 * import { DEFAULT_RETRY_OPTIONS } from '@webventures/comms'
 *
 * console.log(DEFAULT_RETRY_OPTIONS)
 * // {
 * //   maxRetries: 3,
 * //   baseDelay: 1000,
 * //   maxDelay: 30000,
 * //   jitter: true,
 * //   maxJitter: 1000
 * // }
 *
 * // Override specific values while keeping other defaults
 * const customOptions = {
 *   ...DEFAULT_RETRY_OPTIONS,
 *   maxRetries: 5,
 *   baseDelay: 500
 * }
 * ```
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
 * Information about a retry attempt, passed to the onRetry callback
 *
 * This interface provides context about each retry attempt, allowing you to
 * implement logging, metrics, or custom monitoring for retry operations.
 *
 * @example
 * ```typescript
 * const result = await withRetry(fetchData, {
 *   maxRetries: 3,
 *   onRetry: (info: RetryAttemptInfo) => {
 *     console.log(`Attempt ${info.attempt} failed: ${info.error.message}`)
 *     console.log(`Retrying in ${info.delay}ms...`)
 *
 *     // Track metrics
 *     metrics.increment('api.retry', {
 *       attempt: info.attempt,
 *       errorType: info.error.name
 *     })
 *   }
 * })
 * ```
 */
export interface RetryAttemptInfo {
  /**
   * The current retry attempt number (1-based)
   * - attempt 1 = first retry (after first failure)
   * - attempt 2 = second retry (after second failure)
   * - etc.
   */
  attempt: number
  /**
   * The error that triggered this retry
   * Contains the original error message and any associated properties
   */
  error: Error
  /**
   * The delay in milliseconds before this retry attempt starts
   * Calculated using exponential backoff with optional jitter
   */
  delay: number
}

/**
 * Context provided to the shouldRetry callback for custom retry decisions
 *
 * Use this interface when implementing custom retry logic. The callback receives
 * comprehensive information about the failure, allowing you to make informed
 * decisions about whether to retry.
 *
 * @example
 * ```typescript
 * const result = await withRetry(fetchData, {
 *   maxRetries: 5,
 *   shouldRetry: (ctx: ShouldRetryContext) => {
 *     // Don't retry after 3 attempts
 *     if (ctx.attempt > 3) return false
 *
 *     // Always retry rate limiting
 *     if (ctx.statusCode === 429) return true
 *
 *     // Retry server errors
 *     if (ctx.statusCode !== undefined && ctx.statusCode >= 500) return true
 *
 *     // Retry specific error messages
 *     if (ctx.error.message.includes('ECONNREFUSED')) return true
 *
 *     // Don't retry client errors
 *     return false
 *   }
 * })
 * ```
 */
export interface ShouldRetryContext {
  /**
   * The current attempt number (1-based)
   * - attempt 1 = first retry decision (after first failure)
   * - attempt 2 = second retry decision (after second failure)
   * Use this to implement attempt-based backoff or give up after N attempts
   */
  attempt: number
  /**
   * The error that occurred
   * Examine error.message, error.name, or error.cause for retry decisions
   */
  error: Error
  /**
   * HTTP status code if available, undefined for network errors
   * Use to distinguish client errors (4xx) from server errors (5xx)
   */
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
 * Creates a complete retry options object by filling in any missing properties
 * with sensible defaults. This ensures all required values are present while
 * allowing callers to override only the options they care about.
 *
 * @param options - User-provided retry options (all properties are optional)
 * @returns Complete retry options with all defaults applied
 *
 * @example
 * ```typescript
 * // Get all defaults
 * const opts = getRetryOptionsWithDefaults()
 * // opts.maxRetries = 3
 * // opts.baseDelay = 1000
 * // opts.maxDelay = 30000
 * // opts.jitter = true
 * // opts.maxJitter = 1000
 * // opts.retryableStatusCodes = [408, 429, 500, 502, 503, 504]
 *
 * // Override specific values
 * const customOpts = getRetryOptionsWithDefaults({
 *   maxRetries: 5,
 *   baseDelay: 500
 * })
 * // customOpts.maxRetries = 5
 * // customOpts.baseDelay = 500
 * // customOpts.maxDelay = 30000 (default)
 *
 * // With callbacks
 * const withCallbacks = getRetryOptionsWithDefaults({
 *   onRetry: ({ attempt, delay }) => console.log(`Retry ${attempt} in ${delay}ms`),
 *   shouldRetry: ({ statusCode }) => statusCode === 429
 * })
 * ```
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
 * Checks if an HTTP status code should trigger a retry
 *
 * This function determines whether a given HTTP status code is considered
 * "retryable" based on a configurable list. Status codes are typically retryable
 * when they indicate temporary failures that may succeed on subsequent attempts.
 *
 * Common retryable status codes:
 * - 408: Request Timeout (client-side timeout)
 * - 429: Too Many Requests (rate limiting)
 * - 500: Internal Server Error
 * - 502: Bad Gateway
 * - 503: Service Unavailable
 * - 504: Gateway Timeout
 *
 * @param statusCode - HTTP status code to check (undefined returns false)
 * @param retryableStatusCodes - List of status codes that should trigger a retry
 *                               (defaults to DEFAULT_RETRYABLE_STATUS_CODES)
 * @returns true if the status code is in the retryable list, false otherwise
 *
 * @example
 * ```typescript
 * // Using default retryable status codes
 * isRetryableStatusCode(429)  // true - rate limited
 * isRetryableStatusCode(503)  // true - service unavailable
 * isRetryableStatusCode(404)  // false - not found (not retryable)
 * isRetryableStatusCode(401)  // false - unauthorized (not retryable)
 * isRetryableStatusCode(undefined)  // false - no status code
 *
 * // With custom retryable status codes
 * const customCodes = [429, 503]
 * isRetryableStatusCode(500, customCodes)  // false - not in custom list
 * isRetryableStatusCode(429, customCodes)  // true
 *
 * // Use in retry decision logic
 * function shouldRetryRequest(error: Error, statusCode?: number): boolean {
 *   if (statusCode !== undefined) {
 *     return isRetryableStatusCode(statusCode)
 *   }
 *   // No status code - likely a network error, retry by default
 *   return true
 * }
 * ```
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
 * Options for the calculateBackoff function
 *
 * Controls how backoff delays are calculated for retry attempts. Exponential
 * backoff increases wait times between retries to reduce load on failing services.
 *
 * @example
 * ```typescript
 * // Default options (jitter enabled for production use)
 * calculateBackoff(1)  // ~1000-2000ms
 * calculateBackoff(2)  // ~2000-3000ms
 * calculateBackoff(3)  // ~4000-5000ms
 *
 * // No jitter (predictable for testing)
 * calculateBackoff(1, { jitter: false })  // exactly 1000ms
 * calculateBackoff(2, { jitter: false })  // exactly 2000ms
 *
 * // Custom configuration
 * const options: BackoffOptions = {
 *   baseDelay: 500,     // Start at 500ms
 *   maxDelay: 10000,    // Cap at 10 seconds
 *   jitter: true,       // Add randomization
 *   maxJitter: 200      // Up to 200ms of jitter
 * }
 * calculateBackoff(3, options)  // ~2000-2200ms (capped at 10s)
 * ```
 */
export interface BackoffOptions {
  /**
   * Base delay in milliseconds for the first retry
   * Subsequent retries double this value (exponential growth)
   * @default 1000
   */
  baseDelay?: number

  /**
   * Maximum delay in milliseconds between retries
   * Prevents exponential growth from creating excessively long waits
   * @default 30000
   */
  maxDelay?: number

  /**
   * Whether to add random jitter to the delay
   * Recommended for production to prevent thundering herd problems
   * @default true
   */
  jitter?: boolean

  /**
   * Maximum jitter in milliseconds to add to the delay
   * Actual jitter is random between 0 and this value
   * Only used when jitter is enabled
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

/**
 * Creates a promise that resolves after a specified delay, with support for cancellation via AbortSignal
 *
 * This is useful for implementing retry delays that can be cancelled when the overall operation
 * is aborted (e.g., due to timeout or user cancellation).
 *
 * @param ms - The delay duration in milliseconds
 * @param signal - Optional AbortSignal to cancel the delay
 * @returns A promise that resolves after the delay or rejects if aborted
 * @throws {Error} Throws with name 'AbortError' if the signal is aborted
 *
 * @example
 * ```typescript
 * // Simple delay
 * await delay(1000)
 *
 * // Delay with cancellation support
 * const controller = new AbortController()
 *
 * // Cancel after 500ms
 * setTimeout(() => controller.abort(), 500)
 *
 * try {
 *   await delay(1000, controller.signal)
 * } catch (error) {
 *   if (error.name === 'AbortError') {
 *     console.log('Delay was cancelled')
 *   }
 * }
 *
 * // Use in retry loop
 * async function retryOperation() {
 *   const controller = new AbortController()
 *   for (let attempt = 1; attempt <= 3; attempt++) {
 *     try {
 *       return await doSomething()
 *     } catch (error) {
 *       const backoff = calculateBackoff(attempt)
 *       await delay(backoff, controller.signal)
 *     }
 *   }
 * }
 * ```
 */
export function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    // If already aborted, reject immediately
    if (signal?.aborted) {
      const error = new Error('Delay aborted')
      error.name = 'AbortError'
      reject(error)
      return
    }

    const timeoutId = setTimeout(() => {
      // Clean up abort listener before resolving
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)

    function onAbort() {
      clearTimeout(timeoutId)
      const error = new Error('Delay aborted')
      error.name = 'AbortError'
      reject(error)
    }

    // Listen for abort signal
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

/**
 * Extracts an HTTP status code from an error object if available
 *
 * This function attempts to find an HTTP status code from various error formats
 * commonly used in Node.js and browser environments. It supports:
 *
 * - Errors with a `statusCode` property (RequestError, NetworkError, got, axios)
 * - Errors with a `status` property (fetch Response, some HTTP libraries)
 * - Errors with a `response.status` property (axios, node-fetch wrappers)
 *
 * This is useful for retry logic to determine if a failure is retryable based
 * on the HTTP status code (e.g., 429 Too Many Requests, 503 Service Unavailable).
 *
 * @param error - The error to extract status code from (any type)
 * @returns The HTTP status code if found, undefined otherwise
 *
 * @example
 * ```typescript
 * // RequestError from this library
 * const requestError = new RequestError('Server error', 500, 'https://api.example.com')
 * getStatusCodeFromError(requestError)  // 500
 *
 * // NetworkError from this library
 * const networkError = new NetworkError('Service unavailable', 503)
 * getStatusCodeFromError(networkError)  // 503
 *
 * // Error with status property
 * const statusError = { message: 'Rate limited', status: 429 }
 * getStatusCodeFromError(statusError)  // 429
 *
 * // Axios-style error with response object
 * const axiosError = {
 *   message: 'Request failed',
 *   response: { status: 502, data: 'Bad Gateway' }
 * }
 * getStatusCodeFromError(axiosError)  // 502
 *
 * // Plain Error (no status code)
 * const plainError = new Error('Network timeout')
 * getStatusCodeFromError(plainError)  // undefined
 *
 * // Null or non-object values
 * getStatusCodeFromError(null)       // undefined
 * getStatusCodeFromError('string')   // undefined
 *
 * // Use in retry logic
 * function shouldRetry(error: unknown): boolean {
 *   const statusCode = getStatusCodeFromError(error)
 *   if (statusCode !== undefined) {
 *     return isRetryableStatusCode(statusCode)
 *   }
 *   // No status code - likely network error, retry
 *   return true
 * }
 * ```
 */
export function getStatusCodeFromError(error: unknown): number | undefined {
  if (error === null || typeof error !== 'object') {
    return undefined
  }

  // Check for statusCode property (RequestError, NetworkError)
  if ('statusCode' in error && typeof error.statusCode === 'number') {
    return error.statusCode
  }

  // Check for status property
  if ('status' in error && typeof error.status === 'number') {
    return error.status
  }

  // Check for response.status (fetch-style errors)
  if ('response' in error && error.response !== null && typeof error.response === 'object') {
    const response = error.response as Record<string, unknown>
    if ('status' in response && typeof response.status === 'number') {
      return response.status
    }
  }

  return undefined
}

/**
 * Wraps an async function with retry logic using exponential backoff
 *
 * This function executes the provided async function and automatically retries
 * on failure according to the configured retry options. It's generic and works
 * with any async operation, not just HTTP requests.
 *
 * Key features:
 * - Exponential backoff with optional jitter to prevent thundering herd
 * - Configurable retry conditions via shouldRetry callback or status codes
 * - AbortSignal support for cancellation during retries
 * - onRetry callback for logging and monitoring
 * - Preserves the original error if all retries fail
 *
 * @typeParam T - The return type of the async function
 * @param fn - The async function to execute with retry logic
 * @param options - Configuration options for retry behavior
 * @returns A promise that resolves with the function result or rejects with the last error
 * @throws The last error encountered if all retries are exhausted or if the error is not retryable
 *
 * @example
 * ```typescript
 * // Basic usage - retry a function up to 3 times
 * const result = await withRetry(
 *   () => fetchData('/api/data'),
 *   { maxRetries: 3 }
 * )
 *
 * // With custom retry conditions
 * const result = await withRetry(
 *   () => fetchData('/api/data'),
 *   {
 *     maxRetries: 5,
 *     baseDelay: 500,
 *     shouldRetry: ({ error, statusCode }) => {
 *       // Only retry on rate limit or server errors
 *       return statusCode === 429 || (statusCode !== undefined && statusCode >= 500)
 *     }
 *   }
 * )
 *
 * // With abort signal for timeout
 * const controller = new AbortController()
 * setTimeout(() => controller.abort(), 30000)
 *
 * const result = await withRetry(
 *   () => fetchData('/api/data'),
 *   {
 *     maxRetries: 3,
 *     signal: controller.signal,
 *     onRetry: ({ attempt, error, delay }) => {
 *       console.log(`Retry ${attempt} in ${delay}ms: ${error.message}`)
 *     }
 *   }
 * )
 *
 * // Disable retries (maxRetries: 0)
 * const result = await withRetry(
 *   () => fetchData('/api/data'),
 *   { maxRetries: 0 }
 * )
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = getRetryOptionsWithDefaults(options)

  // Attempt 0 is the initial attempt, retries start at attempt 1
  let lastError: Error | undefined

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    // Check if aborted before attempting
    if (opts.signal?.aborted) {
      const error = new Error('Operation aborted')
      error.name = 'AbortError'
      throw error
    }

    try {
      return await fn()
    } catch (error) {
      // Ensure we have an Error object
      const errorObj = error instanceof Error ? error : new Error(String(error))
      lastError = errorObj

      // If this is an AbortError, don't retry - propagate immediately
      if (errorObj.name === 'AbortError') {
        throw errorObj
      }

      // Check if we've exhausted all retries
      if (attempt >= opts.maxRetries) {
        throw lastError
      }

      // Determine if we should retry
      const statusCode = getStatusCodeFromError(error)
      const shouldRetryError = determineShouldRetry(errorObj, statusCode, attempt + 1, opts)

      if (!shouldRetryError) {
        throw lastError
      }

      // Calculate delay for next retry (attempt + 1 because calculateBackoff is 1-based for retries)
      const retryDelay = calculateBackoff(attempt + 1, {
        baseDelay: opts.baseDelay,
        maxDelay: opts.maxDelay,
        jitter: opts.jitter,
        maxJitter: opts.maxJitter,
      })

      // Call onRetry callback if provided
      if (opts.onRetry) {
        opts.onRetry({
          attempt: attempt + 1,
          error: lastError,
          delay: retryDelay,
        })
      }

      // Wait before retrying
      await delay(retryDelay, opts.signal)
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError ?? new Error('Retry failed')
}

/**
 * Determines whether an error should trigger a retry based on configuration
 *
 * @param error - The error that occurred
 * @param statusCode - HTTP status code if available
 * @param attempt - Current attempt number (1-based)
 * @param options - Retry options with defaults applied
 * @returns true if the operation should be retried
 */
function determineShouldRetry(
  error: Error,
  statusCode: number | undefined,
  attempt: number,
  options: ReturnType<typeof getRetryOptionsWithDefaults>
): boolean {
  // If a custom shouldRetry callback is provided, use it
  if (options.shouldRetry) {
    return options.shouldRetry({ attempt, error, statusCode })
  }

  // Default behavior: retry on retryable status codes
  // Also retry if there's no status code (network errors, etc.)
  if (statusCode !== undefined) {
    return isRetryableStatusCode(statusCode, options.retryableStatusCodes)
  }

  // For errors without status codes (network errors, timeouts, etc.), retry by default
  return true
}
