import { vi, test, expect } from 'vitest'
import CommsSdk from '../../../src'
import mockHttp, { mockResponse } from '../mockHttp.test'

vi.mock('../../../src/util/logger', () => ({
  default: {
    warn: vi.fn(),
  },
}))

const sdk = new CommsSdk({
  channels: {
    sms: {
      providers: [
        {
          type: 'nexmo',
          apiKey: 'key',
          apiSecret: 'secret',
        },
      ],
    },
  },
})

const request = {
  sms: {
    from: 'WebVentures',
    to: '+15000000001',
    text: 'Hello John! How are you?',
  },
}

test('Nexmo success with minimal parameters.', async () => {
  mockResponse(200, JSON.stringify({ messages: [{ status: '0', 'message-id': 'returned-id' }] }))
  const result = await sdk.send({
    sms: {
      from: 'WebVentures',
      to: '+15000000001',
      text: 'Hello John! How are you?',
      customize: async (provider: string, request: any) => ({
        ...request,
        text: 'Hello John! How are you??',
      }),
    },
  })
  expect(mockHttp).toHaveBeenLastCalledWith(
    expect.objectContaining({
      hostname: 'rest.nexmo.com',
      method: 'POST',
      path: '/sms/json',
      protocol: 'https:',
      href: 'https://rest.nexmo.com/sms/json',
      headers: expect.objectContaining({
        'Content-Type': ['application/json'],
        'User-Agent': ['webventures-comms/v2 (+https://github.com/cryptventure/comms)'],
      }),
    })
  )
  expect((mockHttp as any).body).toEqual(
    '{"api_key":"key","api_secret":"secret","from":"WebVentures","to":"+15000000001","text":"Hello John! How are you??"}'
  )
  expect(result).toEqual({
    status: 'success',
    channels: {
      sms: { id: 'returned-id', providerId: 'sms-nexmo-provider' },
    },
  })
})

test('Nexmo success with all parameters.', async () => {
  mockResponse(200, JSON.stringify({ messages: [{ status: '0', 'message-id': 'returned-id' }] }))
  const result = await sdk.send(request)
  expect(mockHttp).toHaveBeenLastCalledWith(
    expect.objectContaining({
      hostname: 'rest.nexmo.com',
      method: 'POST',
      path: '/sms/json',
      protocol: 'https:',
      href: 'https://rest.nexmo.com/sms/json',
      headers: expect.objectContaining({
        'Content-Type': ['application/json'],
        'User-Agent': ['webventures-comms/v2 (+https://github.com/cryptventure/comms)'],
      }),
    })
  )
  expect((mockHttp as any).body).toEqual(
    '{"api_key":"key","api_secret":"secret","from":"WebVentures","to":"+15000000001","text":"Hello John! How are you?"}'
  )
  expect(result).toEqual({
    status: 'success',
    channels: {
      sms: { id: 'returned-id', providerId: 'sms-nexmo-provider' },
    },
  })
})

test('Nexmo API error.', async () => {
  mockResponse(400, '')
  const result = await sdk.send(request)
  expect(result).toEqual({
    status: 'error',
    errors: {
      sms: 'HTTP 400',
    },
    channels: {
      sms: { id: undefined, providerId: 'sms-nexmo-provider' },
    },
  })
})

test('Nexmo error.', async () => {
  mockResponse(200, JSON.stringify({ messages: [{ status: '1', 'error-text': 'error!' }] }))
  const result = await sdk.send(request)
  expect(result).toEqual({
    status: 'error',
    errors: {
      sms: 'status: 1, error: error!',
    },
    channels: {
      sms: { id: undefined, providerId: 'sms-nexmo-provider' },
    },
  })
})
