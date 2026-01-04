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
  voice: { from: 'WebVentures', to: '+15000000001', url: 'https://webventures.github.io/comms' },
}

test('voice notification catcher provider should use SMTP provider.', async () => {
  const result = await sdk.send(request)
  expect(mockSend).toHaveBeenLastCalledWith({
    from: 'WebVentures',
    headers: {
      'X-to': '[voice] +15000000001',
      'X-type': 'voice',
    },
    subject: '+15000000001@voice',
    to: '+15000000001@voice',
    text: 'https://webventures.github.io/comms',
  })
  expect(result).toEqual({
    status: 'success',
    channels: {
      voice: { id: undefined, providerId: 'voice-notificationcatcher-provider' },
    },
  })
})

test('voice notification catcher provider should customize requests.', async () => {
  await sdk.send({
    voice: {
      ...request.voice,
      customize: async (provider: string, request: any) => ({ ...request, url: 'url...' }),
    },
  })
  expect(mockSend).toHaveBeenLastCalledWith({
    from: 'WebVentures',
    headers: {
      'X-to': '[voice] +15000000001',
      'X-type': 'voice',
    },
    subject: '+15000000001@voice',
    to: '+15000000001@voice',
    text: 'url...',
  })
})
