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

test('slack notification catcher provider should use SMTP provider.', async () => {
  const result = await sdk.send({
    slack: {
      text: 'Hello John!',
    },
  })
  expect(mockSend).toHaveBeenLastCalledWith({
    to: 'public.channel@slack',
    from: '-',
    subject: 'Hello John!',
    text: 'Hello John!',
    headers: {
      'X-type': 'slack',
      'X-to': '[slack public channel]',
    },
  })
  expect(result).toEqual({
    status: 'success',
    channels: {
      slack: { id: '', providerId: 'slack-notificationcatcher-provider' },
    },
  })
})

test('slack notification catcher provider should use SMTP provider (long message).', async () => {
  const result = await sdk.send({
    slack: {
      text: 'Hello John! How are you?',
    },
  })
  expect(mockSend).toHaveBeenLastCalledWith({
    to: 'public.channel@slack',
    from: '-',
    subject: 'Hello John! How are ...',
    text: 'Hello John! How are you?',
    headers: {
      'X-type': 'slack',
      'X-to': '[slack public channel]',
    },
  })
  expect(result).toEqual({
    status: 'success',
    channels: {
      slack: { id: '', providerId: 'slack-notificationcatcher-provider' },
    },
  })
})

test('slack customized success.', async () => {
  await sdk.send({
    slack: {
      text: '',
      customize: async (_provider: string, _request: any) => ({
        text: 'Hello John! How are you?',
      }),
    },
  })
  expect(mockSend).toHaveBeenLastCalledWith({
    to: 'public.channel@slack',
    from: '-',
    subject: 'Hello John! How are ...',
    text: 'Hello John! How are you?',
    headers: {
      'X-type': 'slack',
      'X-to': '[slack public channel]',
    },
  })
})
