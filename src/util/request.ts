import { request as undiciRequest, Dispatcher } from 'undici'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { withRetry, type RetryOptions, type ShouldRetryContext } from './retry'

/**
 * HTTP methods that are considered safe to retry (idempotent and have no side effects)
 * These methods can be safely retried without risk of duplicate operations
 */
const SAFE_RETRY_METHODS = ['GET', 'HEAD', 'OPTIONS'] as const

/**
 * Custom error class for HTTP request errors
 */
export class RequestError extends Error {
  override readonly cause?: unknown

  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly url?: string,
    cause?: unknown
  ) {
    super(message)
    this.name = 'RequestError'
    this.cause = cause
    Object.setPrototypeOf(this, RequestError.prototype)
  }
}

/**
 * Request options interface
 * Supports all standard fetch options plus proxy configuration
 */
export interface RequestOptions {
  method?: string
  headers?: Record<string, string>
  body?: string | Buffer | null
  agent?: Dispatcher | undefined
  signal?: globalThis.AbortSignal
  redirect?: 'follow' | 'manual' | 'error'
  // Undici-specific options
  maxRedirections?: number
  throwOnError?: boolean
  /**
   * Optional retry configuration for automatic request retry with exponential backoff.
   * When provided, failed requests will be retried according to the specified options.
   * If not provided, no retries will occur (backward compatible).
   *
   * @example
   * ```typescript
   * const response = await request('https://api.example.com/data', {
   *   retry: {
   *     maxRetries: 3,
   *     baseDelay: 1000,
   *     retryableStatusCodes: [429, 500, 502, 503, 504]
   *   }
   * })
   * ```
   */
  retry?: RetryOptions
}

/**
 * Makes an HTTP request using undici (native fetch in Node.js 18+)
 * Automatically configures HTTPS proxy if COMMS_HTTP_PROXY environment variable is set
 *
 * This function is SSR-safe and works in:
 * - Node.js 18+ (uses native fetch/undici)
 * - Next.js server components
 * - React Server Components
 *
 * Note: React Native should use the native fetch API directly instead
 *
 * @param url - The URL to fetch
 * @param options - Request options (extends standard fetch options)
 * @returns Promise resolving to the Response object
 * @throws {RequestError} If the request fails
 *
 * @example
 * ```typescript
 * import request from './request'
 *
 * // Simple GET request
 * const response = await request('https://api.example.com/data')
 * const data = await response.json()
 *
 * // POST request with headers
 * const response = await request('https://api.example.com/users', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ name: 'John' })
 * })
 *
 * // With proxy (set COMMS_HTTP_PROXY env var)
 * // COMMS_HTTP_PROXY=http://proxy.example.com:8080
 * const response = await request('https://api.example.com/data')
 * ```
 */
export default async function request(
  url: string,
  options: RequestOptions = {}
): Promise<globalThis.Response> {
  // Validate URL upfront (outside retry logic - invalid URLs should not be retried)
  if (!url || typeof url !== 'string') {
    throw new RequestError('Invalid URL: URL must be a non-empty string', undefined, url)
  }

  try {
    new globalThis.URL(url)
  } catch (error) {
    throw new RequestError(`Invalid URL format: ${url}`, undefined, url, error)
  }

  // Configure HTTPS proxy if environment variable is set (do once, outside retry)
  const proxyUrl = process.env.COMMS_HTTP_PROXY
  if (!options.agent && proxyUrl) {
    try {
      options.agent = new HttpsProxyAgent(proxyUrl) as unknown as Dispatcher
    } catch (error) {
      throw new RequestError(`Failed to configure proxy: ${proxyUrl}`, undefined, url, error)
    }
  }

  // Core request execution logic
  const executeRequest = async (): Promise<globalThis.Response> => {
    try {
      // Use undici's request function for Node.js environments
      // This provides better performance and is the foundation of native fetch in Node 18+
      const { statusCode, headers, body } = await undiciRequest(url, {
        method: options.method || 'GET',
        headers: options.headers,
        body: options.body,
        signal: options.signal,
        dispatcher: options.agent,
      })

      // Convert undici response to standard Response object for API consistency
      const responseHeaders = new globalThis.Headers()
      if (headers) {
        Object.entries(headers).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            value.forEach((v) => responseHeaders.append(key, v))
          } else if (value !== undefined) {
            responseHeaders.set(key, value.toString())
          }
        })
      }

      // Read the body stream
      const chunks: Uint8Array[] = []
      for await (const chunk of body) {
        chunks.push(chunk)
      }
      const buffer = Buffer.concat(chunks)

      // Create a standard Response object
      const response = new globalThis.Response(buffer, {
        status: statusCode,
        statusText: getStatusText(statusCode),
        headers: responseHeaders,
      })

      // Optionally throw on error status codes (makes them retryable)
      if (options.throwOnError && !response.ok) {
        throw new RequestError(`HTTP ${statusCode}: ${getStatusText(statusCode)}`, statusCode, url)
      }

      return response
    } catch (error) {
      // If it's already a RequestError, rethrow it
      if (error instanceof RequestError) {
        throw error
      }

      // Wrap other errors (network errors, etc.)
      throw new RequestError(
        `Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        url,
        error
      )
    }
  }

  // If retry options are provided, wrap with retry logic
  if (options.retry) {
    const method = (options.method || 'GET').toUpperCase()
    const isSafeMethod = SAFE_RETRY_METHODS.includes(method as (typeof SAFE_RETRY_METHODS)[number])

    // Build retry options with safe method check
    const retryOptions: RetryOptions = {
      ...options.retry,
      // Propagate abort signal if not already set in retry options
      signal: options.retry.signal ?? options.signal,
    }

    // If no custom shouldRetry is provided, add safe method check to default behavior
    if (!options.retry.shouldRetry && !isSafeMethod) {
      // Non-safe methods (POST, PUT, DELETE, PATCH) don't retry by default
      // to prevent duplicate side effects. User can override with shouldRetry.
      retryOptions.shouldRetry = () => false
    } else if (options.retry.shouldRetry && !isSafeMethod) {
      // User provided custom shouldRetry - let them decide but warn via wrapped callback
      const userShouldRetry = options.retry.shouldRetry
      retryOptions.shouldRetry = (context: ShouldRetryContext) => userShouldRetry(context)
    }

    return withRetry(executeRequest, retryOptions)
  }

  // No retry - execute once
  return executeRequest()
}

/**
 * Get HTTP status text for a given status code
 * @param statusCode - HTTP status code
 * @returns Status text description
 */
function getStatusText(statusCode: number): string {
  const statusTexts: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    202: 'Accepted',
    204: 'No Content',
    301: 'Moved Permanently',
    302: 'Found',
    304: 'Not Modified',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    408: 'Request Timeout',
    409: 'Conflict',
    410: 'Gone',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
  }

  return statusTexts[statusCode] || 'Unknown'
}

/**
 * Type guard to check if running in a browser environment
 * @returns true if running in a browser
 */
export function isBrowser(): boolean {
  return (
    typeof globalThis !== 'undefined' &&
    'window' in globalThis &&
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    'document' in (globalThis as typeof globalThis & { window?: { document?: unknown } }).window!
  )
}

/**
 * Type guard to check if running in Node.js environment
 * @returns true if running in Node.js
 */
export function isNode(): boolean {
  return typeof process !== 'undefined' && process.versions != null && process.versions.node != null
}
