import { vi, test, expect } from 'vitest'
import CommsSdk from '../../../src'

const mockSend = vi.fn()
vi.mock('../../../src/providers/email/smtp', () => ({
  default: class MockEmailSmtpProvider {
    send = mockSend
  },
}))

const sdk = new CommsSdk({
  useNotificationCatcher: true,
})

const request = {
  push: {
    registrationToken: 'device-token-123',
    title: 'Test Notification',
    body: 'Hello from push!',
  },
}

test('push notification catcher provider should use SMTP provider.', async () => {
  const result = await sdk.send(request)
  expect(mockSend).toHaveBeenLastCalledWith({
    from: '-',
    headers: {
      'X-to': '[push] device-token-123...',
      'X-type': 'push',
      'X-payload': JSON.stringify({ title: 'Test Notification', body: 'Hello from push!' }),
    },
    subject: 'Test Notification',
    to: 'user@push.me',
  })
  expect(result).toEqual({
    status: 'success',
    channels: {
      push: { id: undefined, providerId: 'push-notificationcatcher-provider' },
    },
  })
})

test('push notification catcher provider should use SMTP provider (long title).', async () => {
  const result = await sdk.send({
    push: {
      ...request.push,
      title: 'Very Very Very Very Very Long Title That Will Be Truncated',
    },
  })
  expect(mockSend).toHaveBeenLastCalledWith({
    from: '-',
    headers: {
      'X-to': '[push] device-token-123...',
      'X-type': 'push',
      'X-payload': JSON.stringify({
        title: 'Very Very Very Very Very Long Title That Will Be Truncated',
        body: 'Hello from push!',
      }),
    },
    subject: 'Very Very Very Very ...',
    to: 'user@push.me',
  })
  expect(result).toEqual({
    status: 'success',
    channels: {
      push: { id: undefined, providerId: 'push-notificationcatcher-provider' },
    },
  })
})

test('push notification catcher provider should use SMTP provider (long registration token).', async () => {
  const result = await sdk.send({
    push: {
      registrationToken:
        'very-long-device-token-that-will-be-truncated-for-display-purposes-12345678',
      title: 'Test',
      body: 'Test message',
    },
  })
  expect(mockSend).toHaveBeenLastCalledWith({
    from: '-',
    headers: {
      'X-to': '[push] very-long-device-tok...',
      'X-type': 'push',
      'X-payload': JSON.stringify({ title: 'Test', body: 'Test message' }),
    },
    subject: 'Test',
    to: 'user@push.me',
  })
  expect(result).toEqual({
    status: 'success',
    channels: {
      push: { id: undefined, providerId: 'push-notificationcatcher-provider' },
    },
  })
})

test('push notification catcher provider should handle missing title.', async () => {
  const result = await sdk.send({
    push: {
      registrationToken: 'device-token-123',
      body: 'Test message without title',
    },
  })
  expect(mockSend).toHaveBeenLastCalledWith({
    from: '-',
    headers: {
      'X-to': '[push] device-token-123...',
      'X-type': 'push',
      'X-payload': JSON.stringify({ body: 'Test message without title' }),
    },
    subject: 'Push Notification',
    to: 'user@push.me',
  })
  expect(result).toEqual({
    status: 'success',
    channels: {
      push: { id: undefined, providerId: 'push-notificationcatcher-provider' },
    },
  })
})

test('push notification catcher provider should include all push parameters.', async () => {
  const result = await sdk.send({
    push: {
      registrationToken: 'device-token-123',
      title: 'New Message',
      body: 'You have a new message',
      custom: { userId: '123', action: 'view' },
      priority: 'high',
      badge: 10,
      sound: 'notification.mp3',
      topic: 'com.example.app',
    },
  })
  expect(mockSend).toHaveBeenLastCalledWith({
    from: '-',
    headers: {
      'X-to': '[push] device-token-123...',
      'X-type': 'push',
      'X-payload': JSON.stringify({
        title: 'New Message',
        body: 'You have a new message',
        custom: { userId: '123', action: 'view' },
        priority: 'high',
        badge: 10,
        sound: 'notification.mp3',
        topic: 'com.example.app',
      }),
    },
    subject: 'New Message',
    to: 'user@push.me',
  })
  expect(result).toEqual({
    status: 'success',
    channels: {
      push: { id: undefined, providerId: 'push-notificationcatcher-provider' },
    },
  })
})

test('push notification catcher provider should apply customize function.', async () => {
  const result = await sdk.send({
    push: {
      ...request.push,
      customize: async (providerId: string, req: any) => ({
        ...req,
        title: 'Customized Title',
        body: 'Customized Body',
      }),
    },
  })
  expect(mockSend).toHaveBeenLastCalledWith({
    from: '-',
    headers: {
      'X-to': '[push] device-token-123...',
      'X-type': 'push',
      'X-payload': JSON.stringify({ title: 'Customized Title', body: 'Customized Body' }),
    },
    subject: 'Customized Title',
    to: 'user@push.me',
  })
  expect(result).toEqual({
    status: 'success',
    channels: {
      push: { id: undefined, providerId: 'push-notificationcatcher-provider' },
    },
  })
})
