import CommsSdk from '../src' // or '@webventures/comms' when installed
import type { NotificationRequest } from '../src' // or '@webventures/comms'

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

const run = async () => {
  console.log(await commsSdk.send(notificationRequest))
}
run()
