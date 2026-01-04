/* Based on https://github.com/aws/aws-sdk-js/blob/master/lib/signers/v4_credentials.js */
import { hmac } from '../crypto'
import type { AWSCredentials } from './v4'

/**
 * Custom error class for AWS credentials errors
 */
export class AWSCredentialsError extends Error {
  constructor(
    message: string,
    public override readonly cause?: unknown
  ) {
    super(message)
    this.name = 'AWSCredentialsError'
    Object.setPrototypeOf(this, AWSCredentialsError.prototype)
  }
}

/**
 * Cache for derived signing keys
 * Key format: <credsIdentifier>_<date>_<region>_<service>
 * Value: signing key Buffer
 *
 * @private
 */
let cachedSecret: Record<string, Buffer> = {}

/**
 * Queue of cache keys in insertion order
 * Used for LRU eviction when cache exceeds max size
 *
 * @private
 */
let cacheQueue: string[] = []

/**
 * Maximum number of entries to keep in cache
 * Prevents unbounded memory growth
 *
 * @private
 */
const MAX_CACHE_ENTRIES = 50

/**
 * AWS Signature Version 4 identifier
 *
 * @private
 */
const V4_IDENTIFIER = 'aws4_request'

/**
 * AWS Signature V4 Credentials Helper
 *
 * Provides utility functions for managing AWS credentials and signing keys:
 * - Creates credential scope strings
 * - Derives signing keys from credentials
 * - Caches derived keys for performance
 *
 * The signing key derivation is an expensive operation involving multiple
 * HMAC calculations, so caching provides significant performance benefits
 * when making multiple requests to the same service/region on the same day.
 *
 * @see https://docs.aws.amazon.com/general/latest/gr/signature-v4-examples.html
 */
class V4Credentials {
  /**
   * Create a credential scope string
   *
   * The credential scope is part of the AWS Signature V4 signing process
   * Format: YYYYMMDD/region/service/aws4_request
   *
   * @param date - Date string in YYYYMMDD format
   * @param region - AWS region (e.g., 'us-east-1')
   * @param serviceName - AWS service name (e.g., 'ses', 's3')
   * @returns Credential scope string
   * @throws {AWSCredentialsError} If parameters are invalid
   *
   * @example
   * ```typescript
   * const scope = v4Credentials.createScope('20240101', 'us-east-1', 'ses')
   * // Returns: '20240101/us-east-1/ses/aws4_request'
   * ```
   */
  createScope(date: string, region: string, serviceName: string): string {
    try {
      if (!date || typeof date !== 'string') {
        throw new AWSCredentialsError('Invalid date: must be a non-empty string')
      }

      if (!region || typeof region !== 'string') {
        throw new AWSCredentialsError('Invalid region: must be a non-empty string')
      }

      if (!serviceName || typeof serviceName !== 'string') {
        throw new AWSCredentialsError('Invalid service name: must be a non-empty string')
      }

      // Ensure date is in YYYYMMDD format
      const dateStr = date.substr(0, 8)

      return [dateStr, region, serviceName, V4_IDENTIFIER].join('/')
    } catch (error) {
      if (error instanceof AWSCredentialsError) {
        throw error
      }
      throw new AWSCredentialsError(
        `Failed to create scope: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      )
    }
  }

  /**
   * Get or derive a signing key for AWS Signature V4
   *
   * The signing key is derived through a series of HMAC operations:
   * 1. kDate = HMAC("AWS4" + secretAccessKey, date)
   * 2. kRegion = HMAC(kDate, region)
   * 3. kService = HMAC(kRegion, service)
   * 4. kSigning = HMAC(kService, "aws4_request")
   *
   * Keys are cached to avoid expensive re-computation. The cache is keyed by
   * credentials, date, region, and service, and uses LRU eviction.
   *
   * @param credentials - AWS credentials
   * @param date - Date string in YYYYMMDD format
   * @param region - AWS region (e.g., 'us-east-1')
   * @param service - AWS service name (e.g., 'ses', 's3')
   * @param shouldCache - Whether to cache the derived key (default: true)
   * @returns Signing key as Buffer
   * @throws {AWSCredentialsError} If parameters are invalid or key derivation fails
   *
   * @example
   * ```typescript
   * const credentials = {
   *   accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
   *   secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
   * }
   *
   * const signingKey = v4Credentials.getSigningKey(
   *   credentials,
   *   '20240101',
   *   'us-east-1',
   *   'ses',
   *   true
   * )
   * ```
   */
  getSigningKey(
    credentials: AWSCredentials,
    date: string,
    region: string,
    service: string,
    shouldCache: boolean = true
  ): Buffer {
    try {
      // Validate inputs
      if (!credentials || !credentials.secretAccessKey || !credentials.accessKeyId) {
        throw new AWSCredentialsError(
          'Invalid credentials: secretAccessKey and accessKeyId are required'
        )
      }

      if (!date || typeof date !== 'string') {
        throw new AWSCredentialsError('Invalid date: must be a non-empty string')
      }

      if (!region || typeof region !== 'string') {
        throw new AWSCredentialsError('Invalid region: must be a non-empty string')
      }

      if (!service || typeof service !== 'string') {
        throw new AWSCredentialsError('Invalid service: must be a non-empty string')
      }

      // Create a unique identifier for these credentials
      // This allows caching keys for different credentials separately
      const credsIdentifier = hmac(
        credentials.secretAccessKey,
        credentials.accessKeyId,
        'base64'
      ) as string

      // Create cache key
      const cacheKey = [credsIdentifier, date, region, service].join('_')

      // Check cache if caching is enabled
      if (shouldCache && cacheKey in cachedSecret) {
        const cachedKey = cachedSecret[cacheKey]
        if (cachedKey) {
          return cachedKey
        }
      }

      // Derive signing key through chained HMAC operations
      const kDate = hmac(`AWS4${credentials.secretAccessKey}`, date, 'buffer') as Buffer

      const kRegion = hmac(kDate, region, 'buffer') as Buffer

      const kService = hmac(kRegion, service, 'buffer') as Buffer

      const signingKey = hmac(kService, V4_IDENTIFIER, 'buffer') as Buffer

      // Cache the signing key if caching is enabled
      if (shouldCache) {
        cachedSecret[cacheKey] = signingKey
        cacheQueue.push(cacheKey)

        // Implement LRU eviction: remove oldest entry if cache is full
        if (cacheQueue.length > MAX_CACHE_ENTRIES) {
          const oldestKey = cacheQueue.shift()
          if (oldestKey) {
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete cachedSecret[oldestKey]
          }
        }
      }

      return signingKey
    } catch (error) {
      if (error instanceof AWSCredentialsError) {
        throw error
      }
      throw new AWSCredentialsError(
        `Failed to get signing key: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      )
    }
  }

  /**
   * Empty the signing key cache
   *
   * This is useful for:
   * - Testing (ensuring clean state between tests)
   * - Security (clearing sensitive key material from memory)
   * - Debugging (forcing key re-derivation)
   *
   * Note: This function is primarily for testing purposes
   *
   * @example
   * ```typescript
   * // In tests
   * afterEach(() => {
   *   v4Credentials.emptyCache()
   * })
   *
   * // Or when rotating credentials
   * v4Credentials.emptyCache()
   * ```
   */
  emptyCache(): void {
    cachedSecret = {}
    cacheQueue = []
  }

  /**
   * Get the current cache size
   *
   * Useful for monitoring and debugging
   *
   * @returns Number of entries in the cache
   *
   * @example
   * ```typescript
   * console.log(`Cache contains ${v4Credentials.getCacheSize()} signing keys`)
   * ```
   */
  getCacheSize(): number {
    return cacheQueue.length
  }

  /**
   * Check if a signing key is cached
   *
   * @param credentials - AWS credentials
   * @param date - Date string in YYYYMMDD format
   * @param region - AWS region
   * @param service - AWS service name
   * @returns true if the key is cached, false otherwise
   *
   * @example
   * ```typescript
   * if (v4Credentials.isCached(credentials, '20240101', 'us-east-1', 'ses')) {
   *   console.log('Signing key is cached')
   * }
   * ```
   */
  isCached(credentials: AWSCredentials, date: string, region: string, service: string): boolean {
    try {
      const credsIdentifier = hmac(
        credentials.secretAccessKey,
        credentials.accessKeyId,
        'base64'
      ) as string

      const cacheKey = [credsIdentifier, date, region, service].join('_')
      return cacheKey in cachedSecret
    } catch {
      return false
    }
  }
}

/**
 * Singleton instance of V4Credentials
 * Import and use this throughout your application
 */
export default new V4Credentials()
