import { vi, test, expect } from 'vitest'
import CommsSdk from '../../../src'

vi.mock('../../../src/util/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

const request = {
  slack: {
    text: 'Hello John! How are you?',
  },
}

test('slack unknown provider.', async () => {
  const sdk = new CommsSdk({
    channels: {
      slack: {
        providers: [
          {
            type: 'custom',
            id: 'my-custom-slack-provider',
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
      slack: { id: 'custom-returned-id', providerId: 'my-custom-slack-provider' },
    },
  })
})

test('slack custom provider.', async () => {
  expect(
    () =>
      new CommsSdk({
        channels: {
          slack: {
            providers: [
              {
                type: 'unknown' as any,
              },
            ],
          },
        },
      })
  ).toThrow('Unknown slack provider "unknown"')
})

test('slack logger provider.', async () => {
  const sdk = new CommsSdk({
    channels: {
      slack: {
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
      slack: { id: expect.stringContaining('id-'), providerId: 'slack-logger-provider' },
    },
  })
})
