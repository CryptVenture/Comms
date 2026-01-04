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
          type: 'ovh',
          appKey: 'key',
          appSecret: 'secret',
          consumerKey: 'ckey',
          account: 'account',
          host: 'eu.api.ovh.com',
        },
      ],
    },
  },
})

const request = {
  sms: { from: 'WebVentures', to: '+15000000001', text: 'Hello John! How are you?' },
}

test('Ovh success with minimal parameters.', async () => {
  mockResponse(200, JSON.stringify({ ids: ['returned-id'] }))
  const now = Math.round(Date.now() / 1000)
  const result = await sdk.send(request)
  expect(mockHttp).toHaveBeenLastCalledWith(
    expect.objectContaining({
      hostname: 'eu.api.ovh.com',
      method: 'POST',
      path: '/1.0/sms/account/jobs/',
      protocol: 'https:',
      href: 'https://eu.api.ovh.com/1.0/sms/account/jobs/',
      headers: expect.objectContaining({
        'Content-Type': ['application/json charset=utf-8'],
        'X-Ovh-Application': ['key'],
        'X-Ovh-Consumer': ['ckey'],
        'X-Ovh-Signature': [expect.stringContaining('$1$')],
        'X-Ovh-Timestamp': [expect.stringMatching(new RegExp(`^(${now}|${now + 1})$`))],
        'User-Agent': ['webventures-comms/v2 (+https://github.com/cryptventure/comms)'],
      }),
    })
  )
  expect((mockHttp as any).body).toEqual(
    '{"sender":"WebVentures","message":"Hello John! How are you?","receivers":["+15000000001"],"charset":"UTF-8","class":null,"noStopClause":false}'
  )
  expect(result).toEqual({
    status: 'success',
    channels: {
      sms: { id: 'returned-id', providerId: 'sms-ovh-provider' },
    },
  })
})

test('Ovh success with different message classes.', async () => {
  mockResponse(200, JSON.stringify({ ids: ['returned-id'] }))
  await sdk.send({ sms: { ...request.sms, messageClass: 0 } as any })
  expect((mockHttp as any).body).toEqual(
    '{"sender":"WebVentures","message":"Hello John! How are you?","receivers":["+15000000001"],"charset":"UTF-8","class":"flash","noStopClause":false}'
  )
  await sdk.send({ sms: { ...request.sms, messageClass: 1 } as any })
  expect((mockHttp as any).body).toEqual(
    '{"sender":"WebVentures","message":"Hello John! How are you?","receivers":["+15000000001"],"charset":"UTF-8","class":"phoneDisplay","noStopClause":false}'
  )
  await sdk.send({ sms: { ...request.sms, messageClass: 2 } as any })
  expect((mockHttp as any).body).toEqual(
    '{"sender":"WebVentures","message":"Hello John! How are you?","receivers":["+15000000001"],"charset":"UTF-8","class":"sim","noStopClause":false}'
  )
  await sdk.send({ sms: { ...request.sms, messageClass: 3 } as any })
  expect((mockHttp as any).body).toEqual(
    '{"sender":"WebVentures","message":"Hello John! How are you?","receivers":["+15000000001"],"charset":"UTF-8","class":"toolkit","noStopClause":false}'
  )
})

test('Ovh success with escaped unicode.', async () => {
  mockResponse(200, JSON.stringify({ ids: ['returned-id'] }))
  await sdk.send({ sms: { ...request.sms, text: 'Hello \u0081!' } })
  expect((mockHttp as any).body).toEqual(
    '{"sender":"WebVentures","message":"Hello \u0081!","receivers":["+15000000001"],"charset":"UTF-8","class":null,"noStopClause":false}'
  )
})

test('Ovh should customize requests.', async () => {
  mockResponse(200, JSON.stringify({ ids: ['returned-id'] }))
  await sdk.send({
    sms: {
      ...request.sms,
      text: '',
      customize: async (provider: string, request: any) => ({
        ...request,
        text: 'Hello John! How are you??',
      }),
    },
  })
  expect((mockHttp as any).body).toEqual(
    '{"sender":"WebVentures","message":"Hello John! How are you??","receivers":["+15000000001"],"charset":"UTF-8","class":null,"noStopClause":false}'
  )
})

test('Ovh API error.', async () => {
  mockResponse(400, JSON.stringify({ message: 'error!' }))
  const result = await sdk.send(request)
  expect(result).toEqual({
    status: 'error',
    errors: {
      sms: '400 - error!',
    },
    channels: {
      sms: { id: undefined, providerId: 'sms-ovh-provider' },
    },
  })
})
