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
          type: '46elks',
          apiUsername: 'username',
          apiPassword: 'password',
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

test('46Elks success with minimal parameters.', async () => {
  mockResponse(200, JSON.stringify({ id: 'returned-id' }))
  const result = await sdk.send(request)
  expect(mockHttp).toHaveBeenLastCalledWith(
    expect.objectContaining({
      hostname: 'api.46elks.com',
      method: 'POST',
      path: '/a1/sms',
      protocol: 'https:',
      href: 'https://api.46elks.com/a1/sms',
      headers: expect.objectContaining({
        Authorization: ['Basic dXNlcm5hbWU6cGFzc3dvcmQ='],
        'User-Agent': ['webventures-comms/v2 (+https://github.com/cryptventure/comms)'],
      }),
    })
  )
  expect((mockHttp as any).body).toEqual(
    'from=WebVentures&to=%2B15000000001&message=Hello%20John!%20How%20are%20you%3F'
  )
  expect(result).toEqual({
    status: 'success',
    channels: {
      sms: { id: 'returned-id', providerId: 'sms-46elks-provider' },
    },
  })
})

test('46Elks shouls customize requests.', async () => {
  mockResponse(200, JSON.stringify({ id: 'returned-id' }))
  await sdk.send({
    sms: {
      ...request.sms,
      customize: async (provider: string, request: any) => ({
        ...request,
        text: 'Hello John! How are you??',
      }),
    },
  })
  expect((mockHttp as any).body).toEqual(
    'from=WebVentures&to=%2B15000000001&message=Hello%20John!%20How%20are%20you%3F%3F'
  )
})

test('46Elks error.', async () => {
  mockResponse(400, 'error!')
  const result = await sdk.send(request)
  expect(result).toEqual({
    status: 'error',
    errors: {
      sms: 'error!',
    },
    channels: {
      sms: { id: undefined, providerId: 'sms-46elks-provider' },
    },
  })
})
