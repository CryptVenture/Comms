import { vi, test, expect } from 'vitest'
import CommsSdk from '../../../src'

vi.mock('../../../src/util/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

const request = {
  voice: { from: 'WebVentures', to: '+15000000001', url: 'https://webventures.github.io/comms' },
}

test('voice unknown provider.', async () => {
  const sdk = new CommsSdk({
    channels: {
      voice: {
        providers: [
          {
            type: 'custom',
            id: 'my-custom-voice-provider',
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
      voice: { id: 'custom-returned-id', providerId: 'my-custom-voice-provider' },
    },
  })
})

test('voice custom provider.', async () => {
  expect(
    () =>
      new CommsSdk({
        channels: {
          voice: {
            providers: [
              {
                type: 'unknown' as any,
              },
            ],
          },
        },
      })
  ).toThrow('Unknown voice provider "unknown"')
})

test('voice logger provider.', async () => {
  const sdk = new CommsSdk({
    channels: {
      voice: {
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
      voice: { id: expect.stringContaining('id-'), providerId: 'voice-logger-provider' },
    },
  })
})
