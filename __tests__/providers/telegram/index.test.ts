import { vi, test, expect } from 'vitest'
import CommsSdk from '../../../src'

vi.mock('../../../src/util/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

const request = {
  telegram: {
    chatId: '-1001234567890',
    text: 'Hello John! How are you?',
  },
}

test('telegram custom provider.', async () => {
  const sdk = new CommsSdk({
    channels: {
      telegram: {
        providers: [
          {
            type: 'custom',
            id: 'my-custom-telegram-provider',
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
      telegram: { id: 'custom-returned-id', providerId: 'my-custom-telegram-provider' },
    },
  })
})

test('telegram unknown provider.', async () => {
  expect(
    () =>
      new CommsSdk({
        channels: {
          telegram: {
            providers: [
              {
                type: 'unknown' as any,
              },
            ],
          },
        },
      })
  ).toThrow('Unknown telegram provider "unknown"')
})

test('telegram logger provider.', async () => {
  const sdk = new CommsSdk({
    channels: {
      telegram: {
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
      telegram: { id: expect.stringContaining('id-'), providerId: 'telegram-logger-provider' },
    },
  })
})
