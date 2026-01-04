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
  sms: { from: 'WebVentures', to: '+15000000001', text: 'Hello John!' },
}

test('sms notification catcher provider should use SMTP provider.', async () => {
  const result = await sdk.send(request)
  expect(mockSend).toHaveBeenLastCalledWith({
    from: 'WebVentures',
    headers: {
      'X-to': '[sms] +15000000001',
      'X-type': 'sms',
    },
    subject: 'Hello John!',
    to: '+15000000001@sms',
    text: 'Hello John!',
  })
  expect(result).toEqual({
    status: 'success',
    channels: {
      sms: { id: undefined, providerId: 'sms-notificationcatcher-provider' },
    },
  })
})

test('sms notification catcher provider should use SMTP provider (long message).', async () => {
  const result = await sdk.send({
    sms: {
      ...request.sms,
      customize: async (provider: string, request: any) => ({
        ...request,
        text: 'very very very very very very very very long',
      }),
    },
  })
  expect(mockSend).toHaveBeenLastCalledWith({
    from: 'WebVentures',
    headers: {
      'X-to': '[sms] +15000000001',
      'X-type': 'sms',
    },
    subject: 'very very very very ...',
    to: '+15000000001@sms',
    text: 'very very very very very very very very long',
  })
  expect(result).toEqual({
    status: 'success',
    channels: {
      sms: { id: undefined, providerId: 'sms-notificationcatcher-provider' },
    },
  })
})
