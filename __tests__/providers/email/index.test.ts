import { vi, test, expect } from 'vitest'
import CommsSdk from '../../../src'

vi.mock('../../../src/util/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

const request = {
  email: {
    from: 'me@example.com',
    to: 'john@example.com',
    subject: 'Hi John',
    html: '<b>Hello John! How are you?</b>',
  },
}

test('email unknown provider.', async () => {
  const sdk = new CommsSdk({
    channels: {
      email: {
        providers: [
          {
            type: 'custom',
            id: 'my-custom-email-provider',
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
      email: { id: 'custom-returned-id', providerId: 'my-custom-email-provider' },
    },
  })
})

test('email custom provider.', async () => {
  expect(
    () =>
      new CommsSdk({
        channels: {
          email: {
            providers: [
              {
                type: 'unknown' as any,
              },
            ],
          },
        },
      })
  ).toThrow('Unknown email provider "unknown".')
})

test('email logger provider.', async () => {
  const sdk = new CommsSdk({
    channels: {
      email: {
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
      email: { id: expect.stringContaining('id-'), providerId: 'email-logger-provider' },
    },
  })
})
