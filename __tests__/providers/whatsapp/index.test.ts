import { vi, test, expect } from 'vitest'
import CommsSdk from '../../../src'

vi.mock('../../../src/util/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

const request = {
  whatsapp: {
    from: 'me',
    to: 'you',
    type: 'text' as const,
    text: 'Hello John! How are you?',
  },
}

test('whatsapp unknown provider.', async () => {
  const sdk = new CommsSdk({
    channels: {
      whatsapp: {
        providers: [
          {
            type: 'custom',
            id: 'my-custom-whatsapp-provider',
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
      whatsapp: { id: 'custom-returned-id', providerId: 'my-custom-whatsapp-provider' },
    },
  })
})

test('whatsapp custom provider.', async () => {
  expect(
    () =>
      new CommsSdk({
        channels: {
          whatsapp: {
            providers: [
              {
                type: 'unknown' as any,
              },
            ],
          },
        },
      })
  ).toThrow('Unknown whatsapp provider "unknown"')
})

test('whatsapp logger provider.', async () => {
  const sdk = new CommsSdk({
    channels: {
      whatsapp: {
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
      whatsapp: { id: expect.stringContaining('id-'), providerId: 'whatsapp-logger-provider' },
    },
  })
})
