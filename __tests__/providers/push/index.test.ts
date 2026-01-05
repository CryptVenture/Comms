import { vi, test, expect } from 'vitest'
import CommsSdk from '../../../src'

vi.mock('../../../src/util/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

const request = {
  push: {
    registrationToken: 'device-token-123',
    title: 'Test Notification',
    body: 'Hello from push tests!',
  },
}

test('push custom provider.', async () => {
  const sdk = new CommsSdk({
    channels: {
      push: {
        providers: [
          {
            type: 'custom',
            id: 'my-custom-push-provider',
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
      push: { id: 'custom-returned-id', providerId: 'my-custom-push-provider' },
    },
  })
})

test('push unknown provider.', async () => {
  expect(
    () =>
      new CommsSdk({
        channels: {
          push: {
            providers: [
              {
                type: 'unknown' as any,
              },
            ],
          },
        },
      })
  ).toThrow('Unknown push provider "unknown".')
})

test('push logger provider.', async () => {
  const sdk = new CommsSdk({
    channels: {
      push: {
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
      push: { id: expect.stringContaining('id-'), providerId: 'push-logger-provider' },
    },
  })
})
