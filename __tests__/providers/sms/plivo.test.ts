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
          type: 'plivo',
          authId: 'id',
          authToken: 'token',
        },
      ],
    },
  },
})

const request = {
  sms: { from: 'WebVentures', to: '+15000000001', text: 'Hello John! How are you?' },
}

test('Plivo success with minimal parameters.', async () => {
  mockResponse(200, JSON.stringify({ message_uuid: ['returned-id'] }))
  const result = await sdk.send(request)
  expect(mockHttp).toHaveBeenLastCalledWith(
    expect.objectContaining({
      hostname: 'api.plivo.com',
      method: 'POST',
      path: '/v1/Account/id/Message/',
      protocol: 'https:',
      href: 'https://api.plivo.com/v1/Account/id/Message/',
      headers: expect.objectContaining({
        Authorization: ['Basic aWQ6dG9rZW4='],
        'Content-Type': ['application/json'],
        'User-Agent': ['webventures-comms/v2 (+https://github.com/cryptventure/comms)'],
      }),
    })
  )
  expect((mockHttp as any).body).toEqual(
    '{"src":"WebVentures","dst":"+15000000001","text":"Hello John! How are you?"}'
  )
  expect(result).toEqual({
    status: 'success',
    channels: {
      sms: { id: 'returned-id', providerId: 'sms-plivo-provider' },
    },
  })
})

test('Plivo success with all parameters.', async () => {
  mockResponse(200, JSON.stringify({ message_uuid: ['returned-id'] }))
  const result = await sdk.send({
    sms: {
      from: 'WebVentures',
      to: '+15000000001',
      text: '',
      customize: async (provider: string, request: any) => ({
        ...request,
        text: 'Hello John! How are you??',
      }),
    },
  })
  expect(mockHttp).toHaveBeenLastCalledWith(
    expect.objectContaining({
      hostname: 'api.plivo.com',
      method: 'POST',
      path: '/v1/Account/id/Message/',
      protocol: 'https:',
      href: 'https://api.plivo.com/v1/Account/id/Message/',
      headers: expect.objectContaining({
        Authorization: ['Basic aWQ6dG9rZW4='],
        'Content-Type': ['application/json'],
        'User-Agent': ['webventures-comms/v2 (+https://github.com/cryptventure/comms)'],
      }),
    })
  )
  expect((mockHttp as any).body).toEqual(
    '{"src":"WebVentures","dst":"+15000000001","text":"Hello John! How are you??"}'
  )
  expect(result).toEqual({
    status: 'success',
    channels: {
      sms: { id: 'returned-id', providerId: 'sms-plivo-provider' },
    },
  })
})

test('Plivo API unauthorized error.', async () => {
  mockResponse(401, 'unauthorized')
  const result = await sdk.send(request)
  expect(result).toEqual({
    status: 'error',
    errors: {
      sms: 'unauthorized',
    },
    channels: {
      sms: { id: undefined, providerId: 'sms-plivo-provider' },
    },
  })
})

test('Plivo API error.', async () => {
  mockResponse(400, JSON.stringify({ error: 'error!' }))
  const result = await sdk.send(request)
  expect(result).toEqual({
    status: 'error',
    errors: {
      sms: 'error!',
    },
    channels: {
      sms: { id: undefined, providerId: 'sms-plivo-provider' },
    },
  })
})
