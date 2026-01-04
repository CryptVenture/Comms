import { vi, test, expect } from 'vitest'
import CommsSdk from '../../../src'

vi.mock('../../../src/util/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

const request = {
  sms: { from: 'WebVentures', to: '+15000000001', text: 'Hello John! How are you?' },
}

test('sms unknown provider.', async () => {
  const sdk = new CommsSdk({
    channels: {
      sms: {
        providers: [
          {
            type: 'custom',
            id: 'my-custom-sms-provider',
            send: async () => 'custom-returned-id',
          },
        ],
      },
    },
  })
  const result = await sdk.send(request)
  expect(result).toEqual({
    status: 'success',
    channels: {
      sms: { id: 'custom-returned-id', providerId: 'my-custom-sms-provider' },
    },
  })
})

test('sms custom provider.', async () => {
  expect(
    () =>
      new CommsSdk({
        channels: {
          sms: {
            providers: [
              {
                type: 'unknown' as any,
              },
            ],
          },
        },
      })
  ).toThrow('Unknown sms provider "unknown".')
})

test('sms logger provider.', async () => {
  const sdk = new CommsSdk({
    channels: {
      sms: {
        providers: [
          {
            type: 'logger',
          },
        ],
      },
    },
  })
  const result = await sdk.send(request)
  expect(result).toEqual({
    status: 'success',
    channels: {
      sms: { id: expect.stringContaining('id-'), providerId: 'sms-logger-provider' },
    },
  })
})
