import { vi, test, expect } from 'vitest'
import CommsSdk from '../src'

vi.mock('../src/util/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

const request = {
  socket: {
    to: 'john@example.com',
    text: 'Hi John',
  },
}

test.only('socket', async () => {
  let socketCalled = false
  const sdk = new CommsSdk({
    channels: {
      socket: {
        multiProviderStrategy: 'fallback',
        providers: [
          {
            type: 'custom',
            id: 'my-socket-sender',
            send: async () => {
              socketCalled = true
              return 'custom-socket-id'
            },
          },
        ],
      },
    } as any,
  })
  const result = await sdk.send(request)

  expect(socketCalled).toBe(true)
  expect(result).toEqual({
    status: 'success',
    channels: {
      socket: {
        id: 'custom-socket-id',
        providerId: 'my-socket-sender',
      },
    },
  })
})
