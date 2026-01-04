import CommsSdk from '../src' // or '@webventures/comms' when installed
import type { NotificationRequest, EmailRequest } from '../src' // or '@webventures/comms'

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

commsSdk.send(notificationRequest).then(console.log)
