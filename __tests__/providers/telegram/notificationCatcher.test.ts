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

test('telegram notification catcher provider should use SMTP provider.', async () => {
  const result = await sdk.send({
    telegram: {
      chatId: '-1001234567890',
      text: 'Hello John!',
    },
  })
  expect(mockSend).toHaveBeenLastCalledWith({
    to: '-1001234567890@telegram',
    from: '-',
    subject: 'Hello John!',
    text: 'Hello John!',
    headers: {
      'X-type': 'telegram',
      'X-to': '[telegram] -1001234567890',
    },
  })
  expect(result).toEqual({
    status: 'success',
    channels: {
      telegram: { id: '', providerId: 'telegram-notificationcatcher-provider' },
    },
  })
})

test('telegram notification catcher provider should use SMTP provider (long message).', async () => {
  const result = await sdk.send({
    telegram: {
      chatId: '-1001234567890',
      text: 'Hello John! How are you?',
    },
  })
  expect(mockSend).toHaveBeenLastCalledWith({
    to: '-1001234567890@telegram',
    from: '-',
    subject: 'Hello John! How are ...',
    text: 'Hello John! How are you?',
    headers: {
      'X-type': 'telegram',
      'X-to': '[telegram] -1001234567890',
    },
  })
  expect(result).toEqual({
    status: 'success',
    channels: {
      telegram: { id: '', providerId: 'telegram-notificationcatcher-provider' },
    },
  })
})

test('telegram customized success.', async () => {
  await sdk.send({
    telegram: {
      chatId: '',
      text: '',
      customize: async (_provider: string, _request: any) => ({
        chatId: '-1001234567890',
        text: 'Hello John! How are you?',
      }),
    },
  })
  expect(mockSend).toHaveBeenLastCalledWith({
    to: '-1001234567890@telegram',
    from: '-',
    subject: 'Hello John! How are ...',
    text: 'Hello John! How are you?',
    headers: {
      'X-type': 'telegram',
      'X-to': '[telegram] -1001234567890',
    },
  })
})
