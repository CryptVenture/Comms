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

test('webpush notification catcher provider should use SMTP provider.', async () => {
  const result = await sdk.send(request)
  expect(mockSend).toHaveBeenLastCalledWith({
    from: '-',
    headers: {
      'X-payload':
        '{"title":"Hi John","body":"Hello John! How are you?","icon":"https://webventures.github.io/comms/img/icon.png"}',
      'X-to': '[webpush] ',
      'X-type': 'webpush',
    },
    subject: 'Hi John',
    to: 'user@webpush',
  })
  expect(result).toEqual({
    status: 'success',
    channels: {
      webpush: { id: undefined, providerId: 'webpush-notificationcatcher-provider' },
    },
  })
})

test('webpush notification catcher provider should use SMTP provider (with userId).', async () => {
  const result = await sdk.send({ userId: '24', ...request })
  expect(mockSend).toHaveBeenLastCalledWith({
    from: '-',
    headers: {
      'X-payload':
        '{"title":"Hi John","body":"Hello John! How are you?","icon":"https://webventures.github.io/comms/img/icon.png","userId":"24"}',
      'X-to': '[webpush] 24',
      'X-type': 'webpush',
    },
    subject: 'Hi John',
    to: '24@webpush',
  })
  expect(result).toEqual({
    status: 'success',
    channels: {
      webpush: { id: undefined, providerId: 'webpush-notificationcatcher-provider' },
    },
  })
})

test('webpush notification catcher provider should customize requests.', async () => {
  await sdk.send({
    userId: '24',
    webpush: {
      ...request.webpush,
      customize: async (provider: string, request: any) => ({ ...request, title: 'Hi John!' }),
    },
  })
  expect(mockSend).toHaveBeenLastCalledWith({
    from: '-',
    headers: {
      'X-payload':
        '{"title":"Hi John!","body":"Hello John! How are you?","icon":"https://webventures.github.io/comms/img/icon.png","userId":"24"}',
      'X-to': '[webpush] 24',
      'X-type': 'webpush',
    },
    subject: 'Hi John!',
    to: '24@webpush',
  })
})
