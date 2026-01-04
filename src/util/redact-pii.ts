/**
 * PII Redaction Utility
 *
 * Provides utilities for redacting Personally Identifiable Information (PII)
 * from notification requests before logging. This helps maintain GDPR/CCPA
 * compliance and prevents sensitive data exposure in log files.
 *
 * @module util/redact-pii
 */

import { URL } from 'url'

/**
 * Redaction marker constants
 */
const REDACTED = {
  EMAIL: '[REDACTED EMAIL]',
  PHONE: '[REDACTED PHONE]',
  TEXT: '[REDACTED TEXT]',
  TOKEN: '[REDACTED TOKEN]',
  URL: '[REDACTED URL]',
  WEBHOOK: '[REDACTED WEBHOOK]',
  KEY: '[REDACTED KEY]',
  CONTENT: '[REDACTED CONTENT]',
} as const

/**
 * Email address fields that should be redacted
 */
const EMAIL_FIELDS = new Set(['from', 'to', 'cc', 'bcc', 'replyTo'])

/**
 * Phone number fields that should be redacted
 */
const PHONE_FIELDS = new Set(['from', 'to', 'phone'])

/**
 * Text content fields that should be redacted
 */
const TEXT_FIELDS = new Set([
  'text',
  'html',
  'subject',
  'body',
  'title',
  'pretext',
  'fallback',
  'value',
  'author_name',
])

/**
 * Token/key fields that should be redacted
 */
const TOKEN_FIELDS = new Set([
  'registrationToken',
  'auth',
  'p256dh',
  'apiKey',
  'authToken',
  'accessToken',
  'refreshToken',
  'token',
])

/**
 * URL fields that should be redacted (may contain sensitive params/tokens)
 */
const URL_FIELDS = new Set([
  'url',
  'webhookUrl',
  'mediaUrl',
  'fallbackUrl',
  'statusCallback',
  'endpoint',
])

/**
 * Redacts an email address, preserving domain for debugging
 *
 * @param email - Email address to redact
 * @returns Redacted email or redaction marker
 *
 * @example
 * ```typescript
 * redactEmail('user@example.com') // Returns 'u***@example.com'
 * redactEmail('name.surname@company.co.uk') // Returns 'n***@company.co.uk'
 * ```
 */
function redactEmail(email: string): string {
  if (typeof email !== 'string' || !email.includes('@')) {
    return REDACTED.EMAIL
  }

  const [localPart, domain] = email.split('@')
  if (!localPart || !domain) {
    return REDACTED.EMAIL
  }

  const firstChar = localPart[0] ?? ''
  return `${firstChar}***@${domain}`
}

/**
 * Redacts a phone number, preserving country code and last 4 digits
 *
 * @param phone - Phone number to redact
 * @returns Redacted phone number or redaction marker
 *
 * @example
 * ```typescript
 * redactPhone('+1234567890') // Returns '+1***7890'
 * redactPhone('1234567890') // Returns '***7890'
 * ```
 */
function redactPhone(phone: string): string {
  if (typeof phone !== 'string' || phone.length < 4) {
    return REDACTED.PHONE
  }

  const lastFour = phone.slice(-4)
  const prefix = phone.startsWith('+') ? phone.slice(0, 2) : ''

  return prefix ? `${prefix}***${lastFour}` : `***${lastFour}`
}

/**
 * Redacts a URL, keeping only the protocol and domain
 *
 * @param url - URL to redact
 * @returns Redacted URL or redaction marker
 *
 * @example
 * ```typescript
 * redactUrl('https://api.example.com/path?token=abc123')
 * // Returns 'https://api.example.com/[REDACTED]'
 * ```
 */
function redactUrl(url: string): string {
  if (typeof url !== 'string') {
    return REDACTED.URL
  }

  try {
    const parsed = new URL(url)
    return `${parsed.protocol}//${parsed.hostname}/[REDACTED]`
  } catch {
    // Not a valid URL, redact entirely
    return REDACTED.URL
  }
}

/**
 * Determines if a value should be treated as a phone number based on content
 *
 * @param value - Field value to check
 * @returns True if value looks like a phone number
 */
function looksLikePhone(value: unknown): boolean {
  return typeof value === 'string' && value.length >= 4 && /^[\d+\-() ]+$/.test(value)
}

/**
 * Determines if a value should be treated as an email based on content
 *
 * @param value - Field value to check
 * @returns True if value looks like an email
 */
function looksLikeEmail(value: unknown): boolean {
  return typeof value === 'string' && value.includes('@')
}

/**
 * Recursively redacts PII from an object
 *
 * @param data - Data to redact
 * @param depth - Current recursion depth (max 10 to prevent infinite loops)
 * @returns Redacted copy of the data
 */
function redactObject(data: unknown, depth = 0): unknown {
  // Prevent infinite recursion
  if (depth > 10) {
    return REDACTED.CONTENT
  }

  // Handle null/undefined
  if (data === null || data === undefined) {
    return data
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map((item) => redactObject(item, depth + 1))
  }

  // Handle non-object primitives
  if (typeof data !== 'object') {
    return data
  }

  // Handle Buffer objects (common in attachments)
  if (Buffer.isBuffer(data)) {
    return REDACTED.CONTENT
  }

  // Handle dates
  if (data instanceof Date) {
    return data
  }

  // Handle plain objects
  const redacted: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    // Skip metadata fields that are safe to log
    if (key === 'id' || key === 'userId') {
      redacted[key] = value
      continue
    }

    // Skip non-sensitive technical fields
    if (
      key === 'type' ||
      key === 'method' ||
      key === 'nature' ||
      key === 'priority' ||
      key === 'ttl' ||
      key === 'messageClass' ||
      key === 'dir'
    ) {
      redacted[key] = value
      continue
    }

    // Redact based on field name and value type
    // For ambiguous fields (from, to), use content detection to determine type
    const isAmbiguousField = EMAIL_FIELDS.has(key) && PHONE_FIELDS.has(key)

    if (isAmbiguousField) {
      // Ambiguous field - detect based on content (phone numbers take priority)
      if (Array.isArray(value)) {
        redacted[key] = value.map((item) => {
          if (looksLikePhone(item)) {
            return redactPhone(item as string)
          } else if (looksLikeEmail(item)) {
            return redactEmail(item as string)
          } else {
            return item
          }
        })
      } else if (looksLikePhone(value)) {
        redacted[key] = redactPhone(value as string)
      } else if (looksLikeEmail(value)) {
        redacted[key] = redactEmail(value as string)
      } else if (value === null || value === undefined) {
        redacted[key] = value
      } else {
        // Fallback to email redaction for ambiguous fields
        redacted[key] = REDACTED.EMAIL
      }
    } else if (EMAIL_FIELDS.has(key)) {
      if (Array.isArray(value)) {
        redacted[key] = value.map((email) =>
          typeof email === 'string' ? redactEmail(email) : REDACTED.EMAIL
        )
      } else if (typeof value === 'string') {
        redacted[key] = redactEmail(value)
      } else if (value === null || value === undefined) {
        redacted[key] = value
      } else {
        redacted[key] = REDACTED.EMAIL
      }
    } else if (PHONE_FIELDS.has(key)) {
      if (typeof value === 'string') {
        redacted[key] = redactPhone(value)
      } else if (value === null || value === undefined) {
        redacted[key] = value
      } else {
        redacted[key] = REDACTED.PHONE
      }
    } else if (TOKEN_FIELDS.has(key)) {
      redacted[key] = REDACTED.TOKEN
    } else if (URL_FIELDS.has(key) && typeof value === 'string') {
      redacted[key] = key === 'webhookUrl' ? REDACTED.WEBHOOK : redactUrl(value)
    } else if (TEXT_FIELDS.has(key)) {
      // Check for null/undefined before redacting
      if (value === null || value === undefined) {
        redacted[key] = value
      } else {
        redacted[key] = REDACTED.TEXT
      }
    } else if (key === 'attachments' && Array.isArray(value)) {
      // Check if this is an email attachment (has contentType/filename/content)
      // or a Slack-style attachment (has text/title/fields)
      if (value.length > 0) {
        const firstItem = value[0]
        const isEmailAttachment =
          firstItem &&
          typeof firstItem === 'object' &&
          ('content' in firstItem || 'contentType' in firstItem)

        if (isEmailAttachment) {
          // Email attachments - redact content, keep metadata
          redacted[key] = value.map((attachment) => {
            if (typeof attachment !== 'object' || attachment === null) {
              return REDACTED.CONTENT
            }
            return {
              contentType: (attachment as { contentType?: unknown }).contentType,
              filename: (attachment as { filename?: unknown }).filename,
              content: REDACTED.CONTENT,
            }
          })
        } else {
          // Slack-style attachments - recursively redact
          redacted[key] = value.map((attachment) => redactObject(attachment, depth + 1))
        }
      } else {
        redacted[key] = value
      }
    } else if (key === 'subscription' && typeof value === 'object' && value !== null) {
      // Special handling for webpush subscriptions
      const sub = value as Record<string, unknown>
      redacted[key] = {
        endpoint: sub.endpoint ? redactUrl(sub.endpoint as string) : REDACTED.URL,
        keys:
          sub.keys && typeof sub.keys === 'object'
            ? {
                auth: REDACTED.KEY,
                p256dh: REDACTED.KEY,
              }
            : REDACTED.KEY,
      }
    } else if (key === 'custom' || key === 'templateData' || key === 'headers') {
      // Generic object/data fields - redact content but keep structure
      redacted[key] = typeof value === 'object' && value !== null ? '[REDACTED OBJECT]' : value
    } else if (key === 'content') {
      // File/buffer content
      redacted[key] = REDACTED.CONTENT
    } else if (typeof value === 'object' && value !== null) {
      // Recursively redact nested objects
      redacted[key] = redactObject(value, depth + 1)
    } else {
      // Keep other values as-is (numbers, booleans, safe strings)
      redacted[key] = value
    }
  }

  return redacted
}

/**
 * Redacts PII from a notification request before logging
 *
 * This function creates a deep copy of the request with sensitive data redacted,
 * including:
 * - Email addresses (preserves domain: user@example.com → u***@example.com)
 * - Phone numbers (preserves last 4 digits: +1234567890 → +1***7890)
 * - Message content (text, html, subject, body)
 * - Tokens and API keys
 * - URLs (keeps domain: https://api.com/path?key=x → https://api.com/[REDACTED])
 * - File content and buffers
 *
 * Safe fields that are preserved:
 * - id, userId (identifiers, not PII)
 * - type, method, nature, priority (technical metadata)
 * - contentType, filename (file metadata without content)
 *
 * @param request - The notification request to redact
 * @returns A redacted copy of the request safe for logging
 *
 * @example
 * ```typescript
 * const request = {
 *   email: {
 *     from: 'sender@example.com',
 *     to: 'recipient@example.com',
 *     subject: 'Welcome!',
 *     text: 'Hello, welcome to our service'
 *   }
 * }
 *
 * const redacted = redactPii(request)
 * // {
 * //   email: {
 * //     from: 's***@example.com',
 * //     to: 'r***@example.com',
 * //     subject: '[REDACTED TEXT]',
 * //     text: '[REDACTED TEXT]'
 * //   }
 * // }
 * ```
 */
export function redactPii(request: unknown): unknown {
  return redactObject(request)
}
