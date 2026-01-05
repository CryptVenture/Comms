import CommsSdk from '../src' // or '@webventures/comms' when installed
import type { NotificationRequest } from '../src' // or '@webventures/comms'

const commsSdk = new CommsSdk({})

const notificationRequest: NotificationRequest = {
  id: '24', // Optional: notification tracking ID
  email: {
    from: 'me@example.com',
    to: 'john@example.com',
    subject: 'Hi John',
    html: '<b>Hello John! How are you?</b>',
  },
  sms: {
    from: '+15000000000',
    to: '+15000000001',
    text: 'Hello John! How are you?',
  },
  push: {
    registrationToken: 'xxxxx',
    title: 'Hi John',
    body: 'Hello John! How are you?',
    icon: 'https://webventures.github.io/comms/img/icon.png',
  },
  webpush: {
    subscription: {
      keys: {
        auth: 'xxxxx',
        p256dh: 'xxxxx',
      },
      endpoint: 'xxxxx',
    },
    title: 'Hi John',
    body: 'Hello John! How are you?',
    icon: 'https://webventures.github.io/comms/img/icon.png',
  },
}

// Basic error handling pattern
commsSdk
  .send(notificationRequest)
  .then((result) => {
    // Success - notification sent via all configured channels
    console.log('✓ Notification sent successfully')
    console.log('Status:', result.status)
    console.log('Channels:', result.channels)

    // Check if any channels failed
    if (result.errors) {
      console.warn('⚠ Some channels failed:', result.errors)
    }
  })
  .catch((error) => {
    // Error handling - something went wrong
    console.error('✗ Failed to send notification:', error.message)

    // In production, you might want to:
    // - Log to error tracking service (Sentry, Rollbar, etc.)
    // - Retry with exponential backoff
    // - Fall back to alternative notification channel
    // - Alert operations team for critical failures

    // Re-throw if you want calling code to handle it
    // throw error
  })
