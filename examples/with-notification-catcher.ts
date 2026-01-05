import CommsSdk from '../src' // or '@webventures/comms' when installed
import type { NotificationRequest } from '../src' // or '@webventures/comms'
import { NetworkError } from '../src' // or '@webventures/comms'

/*
 * Note: Notification catcher must be running locally.
 * Run `pnpm add --dev notification-catcher && pnpm run notification-catcher`
 */

const commsSdk = new CommsSdk({
  useNotificationCatcher: true,
})

const notificationRequest: NotificationRequest = {
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

/**
 * Development pattern: Testing with notification catcher
 * Handles common connection errors when notification catcher isn't running
 */
const run = async () => {
  try {
    console.log('📨 Sending test notification to notification catcher...\n')

    const result = await commsSdk.send(notificationRequest)

    // Success - notification captured
    console.log('✓ Notifications captured successfully!')
    console.log('\nView them at: http://localhost:1025')
    console.log('\nResult:', JSON.stringify(result, null, 2))

    console.log('\n📋 Channel details:')
    Object.entries(result.channels || {}).forEach(([channel, info]) => {
      console.log(`  - ${channel}: ${info?.id} (via ${info?.providerId})`)
    })
  } catch (error) {
    // Handle connection errors (notification catcher not running)
    if (error instanceof NetworkError) {
      console.error('\n✗ Connection failed to notification catcher')
      console.error('\nIs notification-catcher running?')
      console.error('Start it with: pnpm run notification-catcher')
      console.error('\nError details:', error.message)

      if (error.statusCode) {
        console.error('Status code:', error.statusCode)
      }

      // In development: Provide helpful guidance
      console.error('\n💡 Troubleshooting:')
      console.error('  1. Check if notification-catcher is installed')
      console.error('  2. Ensure port 1025 is not in use')
      console.error('  3. Try running: npx notification-catcher')

      process.exit(1)
    } else if (error instanceof Error) {
      // Other errors
      console.error('\n✗ Unexpected error:', error.message)
      console.error('\nStack trace:', error.stack)
      process.exit(1)
    }
  }
}

// Execute
run()
  .then(() => {
    console.log('\n✓ Example completed')
  })
  .catch((error) => {
    console.error('\n✗ Fatal error:', error)
    process.exit(1)
  })
