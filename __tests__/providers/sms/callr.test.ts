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
          type: 'callr',
          login: 'login',
          password: 'password',
        },
      ],
    },
  },
})

const request = {
  sms: { from: 'WebVentures', to: '+15000000001', text: 'Hello John! How are you?' },
}

test('Callr success with minimal parameters.', async () => {
  mockResponse(200, JSON.stringify({ data: 'returned-id' }))
  const result = await sdk.send(request)
  expect(mockHttp).toHaveBeenLastCalledWith(
    expect.objectContaining({
      hostname: 'api.callr.com',
      method: 'POST',
      path: '/rest/v1.1/sms',
      protocol: 'https:',
      href: 'https://api.callr.com/rest/v1.1/sms',
      headers: expect.objectContaining({
        Authorization: ['Basic bG9naW46cGFzc3dvcmQ='],
        'Content-Type': ['application/json'],
        'User-Agent': ['webventures-comms/v2 (+https://github.com/cryptventure/comms)'],
      }),
    })
  )
  expect((mockHttp as any).body).toEqual(
    '{"from":"WebVentures","to":"+15000000001","body":"Hello John! How are you?","options":{"force_encoding":"GSM","nature":"ALERTING"}}'
  )
  expect(result).toEqual({
    status: 'success',
    channels: {
      sms: { id: 'returned-id', providerId: 'sms-callr-provider' },
    },
  })
})

test('Callr success with all parameters.', async () => {
  mockResponse(200, JSON.stringify({ data: 'returned-id' }))
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
      hostname: 'api.callr.com',
      method: 'POST',
      path: '/rest/v1.1/sms',
      protocol: 'https:',
      href: 'https://api.callr.com/rest/v1.1/sms',
      headers: expect.objectContaining({
        Authorization: ['Basic bG9naW46cGFzc3dvcmQ='],
        'Content-Type': ['application/json'],
        'User-Agent': ['webventures-comms/v2 (+https://github.com/cryptventure/comms)'],
      }),
    })
  )
  expect((mockHttp as any).body).toEqual(
    '{"from":"WebVentures","to":"+15000000001","body":"Hello John! How are you??","options":{"force_encoding":"UNICODE","nature":"MARKETING"}}'
  )
  expect(result).toEqual({
    status: 'success',
    channels: {
      sms: { id: 'returned-id', providerId: 'sms-callr-provider' },
    },
  })
})

test('Callr error.', async () => {
  mockResponse(400, JSON.stringify({ data: { code: '400', message: 'error!' } }))
  const result = await sdk.send(request)
  expect(result).toEqual({
    status: 'error',
    errors: {
      sms: 'code: 400, message: error!',
    },
    channels: {
      sms: { id: undefined, providerId: 'sms-callr-provider' },
    },
  })
})
