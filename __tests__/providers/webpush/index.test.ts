import { vi, test, expect } from 'vitest'
import CommsSdk from '../../../src'

vi.mock('../../../src/util/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

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

test('webpush unknown provider.', async () => {
  const sdk = new CommsSdk({
    channels: {
      webpush: {
        providers: [
          {
            type: 'custom',
            id: 'my-custom-webpush-provider',
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
      webpush: { id: 'custom-returned-id', providerId: 'my-custom-webpush-provider' },
    },
  })
})

test('webpush custom provider.', async () => {
  expect(
    () =>
      new CommsSdk({
        channels: {
          webpush: {
            providers: [
              {
                type: 'unknown' as any,
              },
            ],
          },
        },
      })
  ).toThrow('Unknown webpush provider "unknown"')
})

test('webpush logger provider.', async () => {
  const sdk = new CommsSdk({
    channels: {
      webpush: {
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
      webpush: { id: expect.stringContaining('id-'), providerId: 'webpush-logger-provider' },
    },
  })
})
