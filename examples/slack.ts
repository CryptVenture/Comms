import CommsSdk from '../src' // or '@webventures/comms' when installed
import type { NotificationRequest, CommsSdkConfig } from '../src' // or '@webventures/comms'
import { ProviderError, NetworkError, isProviderError } from '../src' // or '@webventures/comms'

const config: CommsSdkConfig = {
  channels: {
    slack: {
      providers: [
        {
          type: 'logger',
        },
      ],
    },
  },
}

const commsSdk = new CommsSdk(config)

const notificationRequest: NotificationRequest = {
  id: '24', // Optional: notification tracking ID
  slack: {
    text: 'Test Slack webhook :)',
  },
}

/**
 * Production-ready error handling with retry logic and fallback strategies
 */
async function sendSlackNotification(
  maxRetries: number = 3,
  retryDelayMs: number = 1000
): Promise<void> {
  let lastError: Error | undefined

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`\nAttempt ${attempt}/${maxRetries}...`)

      const result = await commsSdk.send(notificationRequest)

      // Success!
      console.log('✓ Slack notification sent successfully')
      console.log('Message ID:', result.channels?.slack?.id)
      console.log('Status:', result.status)

      // Check for partial failures
      if (result.status === 'error' && result.errors) {
        console.warn('⚠ Warning: Some channels failed')
        console.warn('Errors:', result.errors)
        // In production: Log to monitoring service, but notification was sent
      }

      return // Success - exit function
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Determine if error is retryable
      const isRetryable = isRetryableError(error)

      console.error(`✗ Attempt ${attempt} failed:`, lastError.message)

      if (!isRetryable) {
        console.error('Error is not retryable - aborting')
        throw lastError
      }

      if (attempt < maxRetries) {
        // Calculate exponential backoff delay
        const delay = retryDelayMs * Math.pow(2, attempt - 1)
        console.log(`⏱ Retrying in ${delay}ms...`)
        await sleep(delay)
      }
    }
  }

  // All retries exhausted
  console.error(`✗ Failed after ${maxRetries} attempts`)
  throw lastError || new Error('Failed to send Slack notification after all retries')
}

/**
 * Determine if an error should trigger a retry
 */
function isRetryableError(error: unknown): boolean {
  // Network errors are usually transient - retry
  if (error instanceof NetworkError) {
    // 5xx errors are server errors - retry
    if (error.statusCode && error.statusCode >= 500) {
      return true
    }
    // 429 Too Many Requests - retry with backoff
    if (error.statusCode === 429) {
      return true
    }
    // Timeout errors - retry
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
      return true
    }
  }

  // Provider errors - check specific codes
  if (isProviderError(error)) {
    // Rate limits - retry
    if (error.code === 'RATE_LIMIT_EXCEEDED') {
      return true
    }
    // Temporary failures - retry
    if (error.code === 'TEMPORARY_FAILURE' || error.code === 'SERVICE_UNAVAILABLE') {
      return true
    }
  }

  // Configuration errors, validation errors - don't retry
  // Invalid data, missing credentials - won't be fixed by retrying
  return false
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Production pattern: Graceful degradation with fallback
 */
async function sendWithFallback() {
  try {
    // Try primary notification method
    await sendSlackNotification()
  } catch (primaryError) {
    console.error('\n⚠ Primary notification failed, attempting fallback...')

    try {
      // Fallback: Could send email instead, write to queue, etc.
      console.log('Fallback: Writing to error log for manual review')
      console.log('Failed notification:', JSON.stringify(notificationRequest, null, 2))

      // In production, you might:
      // - Send email as fallback
      // - Write to message queue for later processing
      // - Store in database for retry worker
      // - Trigger PagerDuty/alert for critical notifications
    } catch (fallbackError) {
      console.error('✗ Fallback also failed:', fallbackError)

      // Ultimate fallback: Log and alert
      console.error('CRITICAL: All notification methods failed')

      // In production: Alert operations team immediately
      throw new Error('Complete notification failure - manual intervention required')
    }
  }
}

// Execute with comprehensive error handling
console.log('=== Slack Notification with Retry Logic ===')
sendWithFallback()
  .then(() => {
    console.log('\n✓ Notification workflow completed')
  })
  .catch((error) => {
    console.error('\n✗ Fatal error:', error.message)

    // In production:
    // - Log to error tracking (Sentry, Rollbar, etc.)
    // - Send alert to operations team
    // - Record in audit log
    // - Return appropriate HTTP status code to client

    process.exit(1)
  })
