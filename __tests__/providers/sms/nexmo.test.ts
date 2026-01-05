import { vi, test, expect, describe } from 'vitest'
import CommsSdk from '../../../src'
import SmsNexmoProvider from '../../../src/providers/sms/nexmo'
import { ProviderError } from '../../../src/types/errors'
import mockHttp, { mockResponse } from '../mockHttp.test'

vi.mock('../../../src/util/logger', () => ({
  default: {
    warn: vi.fn(),
  },
}))

describe('Nexmo SMS Provider - Constructor Validation', () => {
  test('throws ProviderError when apiKey is missing', () => {
    expect(() => {
      new SmsNexmoProvider({ apiKey: '', apiSecret: 'secret' })
    }).toThrow(ProviderError)

    try {
      new SmsNexmoProvider({ apiKey: '', apiSecret: 'secret' })
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError)
      expect((error as ProviderError).code).toBe('MISSING_CONFIG')
      expect((error as ProviderError).providerId).toBe('sms-nexmo-provider')
      expect((error as ProviderError).channel).toBe('sms')
    }
  })

  test('throws ProviderError when apiSecret is missing', () => {
    expect(() => {
      new SmsNexmoProvider({ apiKey: 'key', apiSecret: '' })
    }).toThrow(ProviderError)

    try {
      new SmsNexmoProvider({ apiKey: 'key', apiSecret: '' })
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError)
      expect((error as ProviderError).code).toBe('MISSING_CONFIG')
    }
  })

  test('throws ProviderError when both apiKey and apiSecret are missing', () => {
    expect(() => {
      new SmsNexmoProvider({ apiKey: '', apiSecret: '' })
    }).toThrow(ProviderError)
  })

  test('creates provider successfully with valid config', () => {
    const provider = new SmsNexmoProvider({ apiKey: 'key', apiSecret: 'secret' })
    expect(provider.id).toBe('sms-nexmo-provider')
  })
})

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
