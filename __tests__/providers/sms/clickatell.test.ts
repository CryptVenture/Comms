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
          type: 'clickatell',
          apiKey: 'my-key',
        },
      ],
    },
  },
})

const request = {
  sms: { from: 'WebVentures', to: '+15000000001', text: 'Hello John! How are you?' },
}

test('Clickatell success with minimal parameters.', async () => {
  mockResponse(200, JSON.stringify({ messages: [{ apiMessageId: 'returned-id' }] }))
  const result = await sdk.send(request)
  expect(mockHttp).toHaveBeenLastCalledWith(
    expect.objectContaining({
      hostname: 'platform.clickatell.com',
      method: 'POST',
      path: '/messages',
      protocol: 'https:',
      href: 'https://platform.clickatell.com/messages',
      headers: expect.objectContaining({
        Authorization: ['my-key'],
        'Content-Type': ['application/json'],
        'User-Agent': ['webventures-comms/v2 (+https://github.com/cryptventure/comms)'],
      }),
    })
  )
  expect((mockHttp as any).body).toEqual(
    '{"to":["+15000000001"],"content":"Hello John! How are you?","charset":"UTF-8"}'
  )
  expect(result).toEqual({
    status: 'success',
    channels: {
      sms: { id: 'returned-id', providerId: 'sms-clickatell-provider' },
    },
  })
})

test('Clickatell success with all parameters.', async () => {
  mockResponse(200, JSON.stringify({ messages: [{ apiMessageId: 'returned-id' }] }))
  const completeRequest = {
    metadata: { id: '24' },
    sms: {
      from: 'WebVentures',
      to: '+15000000001',
      text: 'Hello John! How are you?',
      type: 'unicode',
      nature: 'marketing',
      ttl: 3600,
      messageClass: 1,
      customize: async (provider: string, request: any) => ({
        ...request,
        text: 'Hello John! How are you??',
      }),
    } as any,
  }
  const result = await sdk.send(completeRequest)
  expect(mockHttp).toHaveBeenLastCalledWith(
    expect.objectContaining({
      hostname: 'platform.clickatell.com',
      method: 'POST',
      path: '/messages',
      protocol: 'https:',
      href: 'https://platform.clickatell.com/messages',
      headers: expect.objectContaining({
        Authorization: ['my-key'],
        'Content-Type': ['application/json'],
        'User-Agent': ['webventures-comms/v2 (+https://github.com/cryptventure/comms)'],
      }),
    })
  )
  expect((mockHttp as any).body).toEqual(
    '{"to":["+15000000001"],"content":"Hello John! How are you??","charset":"UCS2-BE","validityPeriod":3600}'
  )
  expect(result).toEqual({
    status: 'success',
    channels: {
      sms: { id: 'returned-id', providerId: 'sms-clickatell-provider' },
    },
  })
})

test('Clickatell API error.', async () => {
  mockResponse(400, 'error!')
  const result = await sdk.send(request)
  expect(result).toEqual({
    status: 'error',
    errors: {
      sms: 'error!',
    },
    channels: {
      sms: { id: undefined, providerId: 'sms-clickatell-provider' },
    },
  })
})

test('Clickatell error.', async () => {
  mockResponse(200, JSON.stringify({ error: 'error!' }))
  const result = await sdk.send(request)
  expect(result).toEqual({
    status: 'error',
    errors: {
      sms: 'error!',
    },
    channels: {
      sms: { id: undefined, providerId: 'sms-clickatell-provider' },
    },
  })
})
