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
  email: {
    from: 'me@example.com',
    to: 'john@example.com',
    subject: 'Hi John',
    html: '<b>Hello John! How are you?</b>',
    text: 'Hello John! How are you?',
    replyTo: 'contact@example.com',
  },
}

test('email notification catcher provider should use SMTP provider.', async () => {
  const result = await sdk.send(request)
  const { to, from, html, text, subject, replyTo } = request.email
  expect(mockSend).toHaveBeenLastCalledWith({
    to,
    from,
    html,
    text,
    subject,
    replyTo,
    headers: { 'X-to': `[email] ${to}` },
  })
  expect(result).toEqual({
    status: 'success',
    channels: {
      email: { id: undefined, providerId: 'email-notificationcatcher-provider' },
    },
  })
})

test('email notification catcher provider should customize requests.', async () => {
  await sdk.send({
    email: {
      ...request.email,
      customize: async (provider: string, request: any) => ({ ...request, subject: 'Hi John!' }),
    },
  })
  const { to, from, html, text, replyTo } = request.email
  expect(mockSend).toHaveBeenLastCalledWith({
    to,
    from,
    html,
    text,
    subject: 'Hi John!',
    replyTo,
    headers: { 'X-to': `[email] ${to}` },
  })
})
