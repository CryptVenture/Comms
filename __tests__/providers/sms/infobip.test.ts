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
          type: 'infobip',
          username: 'username',
          password: 'password',
        },
      ],
    },
  },
})

const request = {
  sms: { from: 'WebVentures', to: '+15000000001', text: 'Hello John! How are you?' },
}

test('Infobip success with minimal parameters.', async () => {
  mockResponse(
    200,
    JSON.stringify({ messages: [{ status: { groupId: 1 }, messageId: 'returned-id' }] })
  )
  const result = await sdk.send(request)
  expect(mockHttp).toHaveBeenLastCalledWith(
    expect.objectContaining({
      hostname: 'api.infobip.com',
      method: 'POST',
      path: '/sms/1/text/single',
      protocol: 'https:',
      href: 'https://api.infobip.com/sms/1/text/single',
      headers: expect.objectContaining({
        Authorization: ['Basic dXNlcm5hbWU6cGFzc3dvcmQ='],
        'Content-Type': ['application/json'],
        'User-Agent': ['webventures-comms/v2 (+https://github.com/cryptventure/comms)'],
      }),
    })
  )
  expect((mockHttp as any).body).toEqual(
    '{"from":"WebVentures","to":"+15000000001","text":"Hello John! How are you?"}'
  )
  expect(result).toEqual({
    status: 'success',
    channels: {
      sms: { id: 'returned-id', providerId: 'sms-infobip-provider' },
    },
  })
})

test('Infobip success with all parameters.', async () => {
  mockResponse(
    200,
    JSON.stringify({ messages: [{ status: { groupId: 1 }, messageId: 'returned-id' }] })
  )
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
      hostname: 'api.infobip.com',
      method: 'POST',
      path: '/sms/1/text/single',
      protocol: 'https:',
      href: 'https://api.infobip.com/sms/1/text/single',
      headers: expect.objectContaining({
        Authorization: ['Basic dXNlcm5hbWU6cGFzc3dvcmQ='],
        'Content-Type': ['application/json'],
        'User-Agent': ['webventures-comms/v2 (+https://github.com/cryptventure/comms)'],
      }),
    })
  )
  expect((mockHttp as any).body).toEqual(
    '{"from":"WebVentures","to":"+15000000001","text":"Hello John! How are you??"}'
  )
  expect(result).toEqual({
    status: 'success',
    channels: {
      sms: { id: 'returned-id', providerId: 'sms-infobip-provider' },
    },
  })
})

test('Infobip API error.', async () => {
  mockResponse(
    400,
    JSON.stringify({
      requestError: { serviceException: { code: '32', message: 'error!' } },
    })
  )
  const result = await sdk.send(request)
  expect(result).toEqual({
    status: 'error',
    errors: {
      sms: 'code: 32, message: error!',
    },
    channels: {
      sms: { id: undefined, providerId: 'sms-infobip-provider' },
    },
  })
})

test('Infobip API error (unknown format).', async () => {
  mockResponse(400, JSON.stringify({ error: 'error!' }))
  const result = await sdk.send(request)
  expect(result).toEqual({
    status: 'error',
    errors: {
      sms: '{"error":"error!"}',
    },
    channels: {
      sms: { id: undefined, providerId: 'sms-infobip-provider' },
    },
  })
})

test('Infobip error.', async () => {
  mockResponse(200, JSON.stringify({ messages: [{ status: { groupId: 0, message: 'error!' } }] }))
  const result = await sdk.send(request)
  expect(result).toEqual({
    status: 'error',
    errors: {
      sms: 'groupId: 0, message: error!',
    },
    channels: {
      sms: { id: undefined, providerId: 'sms-infobip-provider' },
    },
  })
})
