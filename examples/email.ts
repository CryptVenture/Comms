import CommsSdk from '../src' // or '@webventures/comms' when installed
import type { NotificationRequest, EmailRequest } from '../src' // or '@webventures/comms'
import { ProviderError, ConfigurationError, NetworkError } from '../src' // or '@webventures/comms'

const commsSdk = new CommsSdk({})

const emailRequest: EmailRequest = {
  from: 'from@example.com',
  to: 'to@example.com',
  subject: 'Hi John',
  html: '<b>Hello John! How are you?</b>',
  replyTo: 'replyto@example.com',
  text: 'Hello John! How are you?',
  headers: { 'My-Custom-Header': 'my-value' },
  cc: ['cc1@example.com', 'cc2@example.com'],
  bcc: ['bcc@example.com'],
  attachments: [
    {
      contentType: 'text/plain',
      filename: 'test.txt',
      content: 'hello!',
    },
  ],
}

const notificationRequest: NotificationRequest = {
  email: emailRequest,
}

// Advanced error handling with type guards and async/await
async function sendEmailNotification() {
  try {
    const result = await commsSdk.send(notificationRequest)

    // Success handling
    console.log('✓ Email sent successfully')
    console.log('Message ID:', result.channels?.email?.id)
    console.log('Provider used:', result.channels?.email?.providerId)

    return result
  } catch (error) {
    // Type-specific error handling
    if (error instanceof ConfigurationError) {
      // Configuration issue - missing API keys, invalid config, etc.
      console.error('✗ Configuration error:', error.message)
      console.error('  Channel:', error.channel)
      console.error('  Provider:', error.providerType)
      console.error('  Missing fields:', error.missingFields)

      // In production: Alert DevOps, check environment variables
      throw new Error('Email service not configured correctly. Please check API credentials.')
    } else if (error instanceof ProviderError) {
      // Provider-specific error - API failure, rate limits, etc.
      console.error('✗ Provider error:', error.message)
      console.error('  Provider:', error.providerId)
      console.error('  Channel:', error.channel)
      console.error('  Code:', error.code)

      // In production: Log to error tracking, implement retry logic
      // Example: If rate limited, wait and retry; if invalid recipient, skip retry
      if (error.code === 'RATE_LIMIT_EXCEEDED') {
        console.log('Rate limit hit - should implement exponential backoff')
      }

      throw error
    } else if (error instanceof NetworkError) {
      // Network/HTTP error - connection issues, timeouts, etc.
      console.error('✗ Network error:', error.message)
      console.error('  Status code:', error.statusCode)

      // In production: Retry with exponential backoff, use circuit breaker
      throw new Error('Network error - email could not be sent. Will retry automatically.')
    } else if (error instanceof Error) {
      // Generic error
      console.error('✗ Unexpected error:', error.message)
      console.error('  Stack:', error.stack)

      throw error
    } else {
      // Unknown error type
      console.error('✗ Unknown error:', error)
      throw new Error('Failed to send email notification')
    }
  }
}

// Execute and handle top-level errors
sendEmailNotification()
  .then((result) => {
    console.log('\nFinal result:', result)
  })
  .catch((error) => {
    console.error('\nFatal error - notification not sent:', error.message)
    process.exit(1)
  })
