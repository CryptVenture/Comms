/* Based on https://github.com/aws/aws-sdk-js/blob/master/lib/signers/v4.js */
import { hmac, sha256 } from '../crypto'
import v4Credentials from './v4_credentials'

/**
 * AWS credentials interface
 */
export interface AWSCredentials {
  accessKeyId: string
  secretAccessKey: string
  sessionToken?: string
}

/**
 * AWS request interface for signing
 */
export interface AWSRequest {
  method: string
  path: string
  search: string
  region: string
  headers: Record<string, string | undefined>
  body?: string
}

/**
 * AWS Signature V4 options
 */
export interface AWSSignerV4Options {
  signatureCache?: boolean
  operation?: string
}

/**
 * Custom error class for AWS signing errors
 */
export class AWSSignerError extends Error {
  constructor(
    message: string,
    public override readonly cause?: unknown
  ) {
    super(message)
    this.name = 'AWSSignerError'
    Object.setPrototypeOf(this, AWSSignerError.prototype)
  }
}

/**
 * @private
 */
const EXPIRES_HEADER = 'presigned-expires'
const ALGORITHM = 'AWS4-HMAC-SHA256'

/**
 * AWS Signature Version 4 Signer
 *
 * Implements the AWS Signature Version 4 signing process for authenticating
 * requests to AWS services (like SES, S3, SNS, etc.)
 *
 * This implementation is based on the official AWS SDK but with TypeScript
 * types and improved error handling.
 *
 * @see https://docs.aws.amazon.com/general/latest/gr/signature-version-4.html
 *
 * @example
 * ```typescript
 * import AWSSignersV4 from './aws/v4'
 *
 * const request = {
 *   method: 'POST',
 *   path: '/v2/email/outbound-emails',
 *   search: '',
 *   region: 'us-east-1',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'Host': 'email.us-east-1.amazonaws.com'
 *   },
 *   body: JSON.stringify({ ... })
 * }
 *
 * const credentials = {
 *   accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
 *   secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
 * }
 *
 * const signer = new AWSSignersV4(request, 'ses', { signatureCache: true })
 * signer.addAuthorization(credentials, new Date())
 *
 * // Now request.headers.Authorization contains the signature
 * ```
 */
export default class AWSSignersV4 {
  private request: AWSRequest
  private serviceName: string
  private signatureCache: boolean
  // private _operation?: string // Reserved for future use
  private unsignableHeaders: string[] = [
    'authorization',
    'content-type',
    'content-length',
    'user-agent',
    EXPIRES_HEADER,
    'expect',
    'x-amzn-trace-id',
  ]

  /**
   * Create a new AWS Signature V4 signer
   *
   * @param request - The request to sign
   * @param serviceName - AWS service name (e.g., 'ses', 's3', 'sns')
   * @param options - Signer options
   * @throws {AWSSignerError} If request or serviceName is invalid
   */
  constructor(request: AWSRequest, serviceName: string, options: AWSSignerV4Options = {}) {
    if (!request) {
      throw new AWSSignerError('Request is required')
    }

    if (!serviceName || typeof serviceName !== 'string') {
      throw new AWSSignerError('Service name must be a non-empty string')
    }

    this.request = request
    this.serviceName = serviceName
    this.signatureCache = options.signatureCache !== false
    // this._operation = options.operation // Reserved for future use
  }

  /**
   * Add authorization header to the request
   *
   * @param credentials - AWS credentials
   * @param date - Request date
   * @throws {AWSSignerError} If credentials are invalid or signing fails
   */
  addAuthorization(credentials: AWSCredentials, date: Date): void {
    try {
      if (!credentials || !credentials.accessKeyId || !credentials.secretAccessKey) {
        throw new AWSSignerError(
          'Invalid credentials: accessKeyId and secretAccessKey are required'
        )
      }

      if (!(date instanceof Date) || isNaN(date.getTime())) {
        throw new AWSSignerError('Invalid date: must be a valid Date object')
      }

      const datetime = this.toDatetime(date)
      this.addHeaders(credentials, datetime)
      this.request.headers.Authorization = this.authorization(credentials, datetime)
    } catch (error) {
      if (error instanceof AWSSignerError) {
        throw error
      }
      throw new AWSSignerError(
        `Failed to add authorization: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      )
    }
  }

  /**
   * Add required headers for AWS Signature V4
   *
   * @private
   */
  private addHeaders(credentials: AWSCredentials, datetime: string): void {
    this.request.headers['X-Amz-Date'] = datetime
    if (credentials.sessionToken) {
      this.request.headers['x-amz-security-token'] = credentials.sessionToken
    }
  }

  /**
   * Build the Authorization header value
   *
   * @private
   */
  private authorization(credentials: AWSCredentials, datetime: string): string {
    const parts: string[] = []
    const credString = this.credentialString(datetime)

    parts.push(`${ALGORITHM} Credential=${credentials.accessKeyId}/${credString}`)
    parts.push(`SignedHeaders=${this.signedHeaders()}`)
    parts.push(`Signature=${this.signature(credentials, datetime)}`)

    return parts.join(', ')
  }

  /**
   * Calculate the request signature
   *
   * @private
   */
  private signature(credentials: AWSCredentials, datetime: string): string {
    const signingKey = v4Credentials.getSigningKey(
      credentials,
      datetime.substr(0, 8),
      this.request.region,
      this.serviceName,
      this.signatureCache
    )

    return hmac(signingKey, this.stringToSign(datetime), 'hex') as string
  }

  /**
   * Build the string to sign
   *
   * @private
   */
  private stringToSign(datetime: string): string {
    const parts: string[] = []
    parts.push(ALGORITHM)
    parts.push(datetime)
    parts.push(this.credentialString(datetime))
    parts.push(this.hexEncodedHash(this.canonicalString()))
    return parts.join('\n')
  }

  /**
   * Build the canonical request string
   *
   * @private
   */
  private canonicalString(): string {
    const parts: string[] = []
    let pathname = this.request.path

    // S3 has special URL encoding rules
    if (this.serviceName !== 's3') {
      pathname = pathname
        .split('/')
        .map((segment) => this.uriEscape(segment))
        .join('/')
    }

    parts.push(this.request.method)
    parts.push(pathname)
    parts.push(this.request.search)
    parts.push(this.canonicalHeaders() + '\n')
    parts.push(this.signedHeaders())
    parts.push(this.hexEncodedBodyHash())

    return parts.join('\n')
  }

  /**
   * URI escape a string according to AWS rules
   *
   * @private
   */
  private uriEscape(str: string): string {
    let output = encodeURIComponent(str)
    output = output.replace(/[^A-Za-z0-9_.~\-%]+/g, escape)

    // AWS percent-encodes some extra non-standard characters in a URI
    output = output.replace(/[*]/g, (ch) => {
      return '%' + ch.charCodeAt(0).toString(16).toUpperCase()
    })

    return output
  }

  /**
   * Build canonical headers string
   *
   * @private
   */
  private canonicalHeaders(): string {
    const headers: Array<[string, string]> = []

    Object.keys(this.request.headers).forEach((key) => {
      headers.push([key, this.request.headers[key] || ''])
    })

    headers.sort((a, b) => {
      return a[0].toLowerCase() < b[0].toLowerCase() ? -1 : 1
    })

    const parts: string[] = []
    headers.forEach((item) => {
      const key = item[0].toLowerCase()
      if (this.isSignableHeader(key)) {
        const value = item[1]
        if (value === undefined || value === null) {
          throw new AWSSignerError(`Header ${key} contains invalid value`)
        }
        parts.push(`${key}:${this.canonicalHeaderValues(value.toString())}`)
      }
    })

    return parts.join('\n')
  }

  /**
   * Canonicalize header values
   *
   * @private
   */
  private canonicalHeaderValues(values: string): string {
    return values.replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '')
  }

  /**
   * Build signed headers string
   *
   * @private
   */
  private signedHeaders(): string {
    const keys: string[] = []

    Object.keys(this.request.headers).forEach((key) => {
      const lowerKey = key.toLowerCase()
      if (this.isSignableHeader(lowerKey)) {
        keys.push(lowerKey)
      }
    })

    return keys.sort().join(';')
  }

  /**
   * Build credential string
   *
   * @private
   */
  private credentialString(datetime: string): string {
    return v4Credentials.createScope(datetime.substr(0, 8), this.request.region, this.serviceName)
  }

  /**
   * Hex encode a hash
   *
   * @private
   */
  private hexEncodedHash(str: string): string {
    return sha256(str, 'hex') as string
  }

  /**
   * Get hex encoded body hash
   *
   * @private
   */
  private hexEncodedBodyHash(): string {
    if (this.request.headers['X-Amz-Content-Sha256']) {
      return this.request.headers['X-Amz-Content-Sha256']
    } else {
      return this.hexEncodedHash(this.request.body || '')
    }
  }

  /**
   * Check if a header should be signed
   *
   * @private
   */
  private isSignableHeader(key: string): boolean {
    if (key.toLowerCase().indexOf('x-amz-') === 0) {
      return true
    }
    return this.unsignableHeaders.indexOf(key) < 0
  }

  /**
   * Check if this is a presigned request
   *
   * @private
   * Reserved for future use
   */
  // private _isPresigned(): boolean {
  //   return !!this.request.headers[EXPIRES_HEADER]
  // }

  /**
   * Convert Date to ISO datetime string in AWS format
   *
   * @private
   */
  private toDatetime(date: Date): string {
    return date
      .toISOString()
      .replace(/\.\d{3}Z$/, 'Z')
      .replace(/[:-]|\.\d{3}/g, '')
  }
}
