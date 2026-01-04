import CommsSdk from '../src' // or '@webventures/comms' when installed
import type { NotificationRequest, CommsSdkConfig } from '../src' // or '@webventures/comms'

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

commsSdk.send(notificationRequest).then(console.log)
