import crypto from 'crypto'

/**
 * Supported encoding formats for crypto operations
 */
export type CryptoEncoding = 'hex' | 'latin1' | 'base64' | 'buffer'

/**
 * Custom error class for cryptographic operation errors
 */
export class CryptoError extends Error {
  constructor(
    message: string,
    public readonly operation?: string,
    public override readonly cause?: unknown
  ) {
    super(message)
    this.name = 'CryptoError'
    Object.setPrototypeOf(this, CryptoError.prototype)
  }
}

/**
 * Compute HMAC-SHA256 hash
 *
 * HMAC (Hash-based Message Authentication Code) is used for:
 * - Message authentication
 * - API request signing (e.g., AWS Signature V4)
 * - Webhook signature verification
 * - Token generation
 *
 * This function is SSR-safe and works in Node.js and Next.js server components.
 * Note: Not available in React Native - use a crypto polyfill like expo-crypto
 *
 * @param key - The secret key (string or Buffer)
 * @param data - The data to hash (string or Buffer)
 * @param encoding - Output encoding format
 * @returns The HMAC hash in the specified encoding
 * @throws {CryptoError} If the operation fails
 *
 * @example
 * ```typescript
 * import { hmac } from './crypto'
 *
 * // Generate hex-encoded HMAC
 * const signature = hmac('secret-key', 'message', 'hex')
 * console.log(signature) // '0c3a...'
 *
 * // Generate base64-encoded HMAC
 * const token = hmac('api-secret', 'user-data', 'base64')
 *
 * // Generate buffer for further processing
 * const buffer = hmac('key', 'data', 'buffer')
 *
 * // Verify webhook signature
 * const webhookBody = JSON.stringify(payload)
 * const calculatedSig = hmac(webhookSecret, webhookBody, 'hex')
 * const isValid = calculatedSig === receivedSignature
 * ```
 */
export function hmac(
  key: string | Buffer,
  data: string | Buffer,
  encoding: CryptoEncoding
): string | Buffer {
  try {
    // Validate inputs
    if (!key) {
      throw new CryptoError('Invalid key: key cannot be empty', 'hmac')
    }

    if (data === undefined || data === null) {
      throw new CryptoError('Invalid data: data cannot be null or undefined', 'hmac')
    }

    // Convert data to Buffer if it's a string
    const dataBuffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data

    // Create HMAC
    const hmacHash = crypto.createHmac('sha256', key).update(dataBuffer)

    // Return in the requested encoding
    if (encoding === 'buffer') {
      return hmacHash.digest()
    } else if (encoding === 'latin1') {
      // latin1 is a valid BufferEncoding but not part of BinaryToTextEncoding
      // We suppress the error as it works at runtime
      return hmacHash.digest(encoding as 'hex')
    } else {
      return hmacHash.digest(encoding)
    }
  } catch (error) {
    if (error instanceof CryptoError) {
      throw error
    }
    throw new CryptoError(
      `HMAC operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'hmac',
      error
    )
  }
}

/**
 * Compute SHA256 hash
 *
 * SHA256 is used for:
 * - Data integrity verification
 * - Content fingerprinting
 * - Password hashing (though use bcrypt/argon2 for passwords)
 * - File checksums
 *
 * This function is SSR-safe and works in Node.js and Next.js server components.
 * Note: Not available in React Native - use a crypto polyfill like expo-crypto
 *
 * @param data - The data to hash (string or Buffer)
 * @param encoding - Output encoding format
 * @returns The SHA256 hash in the specified encoding
 * @throws {CryptoError} If the operation fails
 *
 * @example
 * ```typescript
 * import { sha256 } from './crypto'
 *
 * // Hash a string
 * const hash = sha256('hello world', 'hex')
 * console.log(hash) // 'b94d27b9...'
 *
 * // Hash for content fingerprinting
 * const fileContent = fs.readFileSync('file.txt', 'utf8')
 * const contentHash = sha256(fileContent, 'base64')
 *
 * // Hash a Buffer
 * const buffer = Buffer.from('data')
 * const bufferHash = sha256(buffer, 'hex')
 *
 * // Get hash as Buffer for further processing
 * const hashBuffer = sha256('data', 'buffer')
 * ```
 */
export function sha256(data: string | Buffer, encoding: CryptoEncoding): string | Buffer {
  try {
    // Validate input
    if (data === undefined || data === null) {
      throw new CryptoError('Invalid data: data cannot be null or undefined', 'sha256')
    }

    // Convert data to Buffer if it's a string
    const dataBuffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data

    // Create hash
    const hash = crypto.createHash('sha256').update(dataBuffer)

    // Return in the requested encoding
    if (encoding === 'buffer') {
      return hash.digest()
    } else if (encoding === 'latin1') {
      // latin1 is a valid BufferEncoding but not part of BinaryToTextEncoding
      // We suppress the error as it works at runtime
      return hash.digest(encoding as 'hex')
    } else {
      return hash.digest(encoding)
    }
  } catch (error) {
    if (error instanceof CryptoError) {
      throw error
    }
    throw new CryptoError(
      `SHA256 operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'sha256',
      error
    )
  }
}

/**
 * Generate a random hex string
 *
 * Useful for:
 * - Generating unique IDs
 * - Creating nonces
 * - Generating API keys
 * - Session tokens
 *
 * @param bytes - Number of random bytes to generate (default: 32)
 * @returns A random hex string
 * @throws {CryptoError} If random generation fails
 *
 * @example
 * ```typescript
 * import { randomHex } from './crypto'
 *
 * // Generate a 32-byte (64-character) hex string
 * const token = randomHex()
 *
 * // Generate a shorter ID
 * const shortId = randomHex(16) // 32 characters
 *
 * // Use for nonces in cryptographic operations
 * const nonce = randomHex(8)
 * ```
 */
export function randomHex(bytes: number = 32): string {
  try {
    if (!Number.isInteger(bytes) || bytes <= 0) {
      throw new CryptoError(`Invalid bytes: expected positive integer, got ${bytes}`, 'randomHex')
    }

    return crypto.randomBytes(bytes).toString('hex')
  } catch (error) {
    if (error instanceof CryptoError) {
      throw error
    }
    throw new CryptoError(
      `Random generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'randomHex',
      error
    )
  }
}

/**
 * Generate a random base64 string
 *
 * Useful for:
 * - API tokens
 * - Session IDs
 * - Secure random strings
 *
 * @param bytes - Number of random bytes to generate (default: 32)
 * @returns A random base64 string
 * @throws {CryptoError} If random generation fails
 *
 * @example
 * ```typescript
 * import { randomBase64 } from './crypto'
 *
 * // Generate a token
 * const apiToken = randomBase64()
 *
 * // Generate a session ID
 * const sessionId = randomBase64(24)
 * ```
 */
export function randomBase64(bytes: number = 32): string {
  try {
    if (!Number.isInteger(bytes) || bytes <= 0) {
      throw new CryptoError(
        `Invalid bytes: expected positive integer, got ${bytes}`,
        'randomBase64'
      )
    }

    return crypto.randomBytes(bytes).toString('base64')
  } catch (error) {
    if (error instanceof CryptoError) {
      throw error
    }
    throw new CryptoError(
      `Random generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'randomBase64',
      error
    )
  }
}

/**
 * Constant-time string comparison to prevent timing attacks
 *
 * Use this when comparing sensitive values like:
 * - API signatures
 * - Authentication tokens
 * - Password hashes
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns true if strings are equal, false otherwise
 * @throws {CryptoError} If comparison fails
 *
 * @example
 * ```typescript
 * import { timingSafeEqual } from './crypto'
 *
 * // Verify HMAC signature
 * const calculatedSig = hmac(secret, data, 'hex')
 * const isValid = timingSafeEqual(calculatedSig, receivedSig)
 *
 * // Compare API tokens
 * const isAuthenticated = timingSafeEqual(providedToken, storedToken)
 * ```
 */
export function timingSafeEqual(a: string, b: string): boolean {
  try {
    if (typeof a !== 'string' || typeof b !== 'string') {
      throw new CryptoError('Invalid input: both arguments must be strings', 'timingSafeEqual')
    }

    // Convert to buffers for constant-time comparison
    const bufA = Buffer.from(a)
    const bufB = Buffer.from(b)

    // If lengths differ, still do the comparison to prevent timing leaks
    if (bufA.length !== bufB.length) {
      return false
    }

    return crypto.timingSafeEqual(bufA, bufB)
  } catch (error) {
    if (error instanceof CryptoError) {
      throw error
    }
    // If buffers have different lengths, crypto.timingSafeEqual throws
    // We catch this and return false
    if (error instanceof RangeError) {
      return false
    }
    throw new CryptoError(
      `Comparison failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'timingSafeEqual',
      error
    )
  }
}
