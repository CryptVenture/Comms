import { vi, test, expect, describe } from 'vitest'
import CommsSdk from '../../../src'
import SmsTwilioProvider from '../../../src/providers/sms/twilio'
import { ProviderError } from '../../../src/types/errors'
import mockHttp, { mockResponse } from '../mockHttp.test'

vi.mock('../../../src/util/logger', () => ({
  default: {
    warn: vi.fn(),
  },
}))

describe('Twilio SMS Provider - Constructor Validation', () => {
  test('throws ProviderError when accountSid is missing', () => {
    expect(() => {
      new SmsTwilioProvider({ accountSid: '', authToken: 'token' })
    }).toThrow(ProviderError)

    try {
      new SmsTwilioProvider({ accountSid: '', authToken: 'token' })
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError)
      expect((error as ProviderError).code).toBe('MISSING_CONFIG')
      expect((error as ProviderError).providerId).toBe('sms-twilio-provider')
      expect((error as ProviderError).channel).toBe('sms')
    }
  })

  test('throws ProviderError when authToken is missing', () => {
    expect(() => {
      new SmsTwilioProvider({ accountSid: 'account', authToken: '' })
    }).toThrow(ProviderError)

    try {
      new SmsTwilioProvider({ accountSid: 'account', authToken: '' })
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError)
      expect((error as ProviderError).code).toBe('MISSING_CONFIG')
    }
  })

  test('throws ProviderError when both accountSid and authToken are missing', () => {
    expect(() => {
      new SmsTwilioProvider({ accountSid: '', authToken: '' })
    }).toThrow(ProviderError)
  })

  test('creates provider successfully with valid config', () => {
    const provider = new SmsTwilioProvider({ accountSid: 'account', authToken: 'token' })
    expect(provider.id).toBe('sms-twilio-provider')
  })
})

const sdk = new CommsSdk({
  channels: {
    sms: {
      providers: [
        {
          type: 'twilio',
          accountSid: 'account',
          authToken: 'token',
        },
      ],
    },
  },
})

const request = {
  sms: { from: 'WebVentures', to: '+15000000001', text: 'Hello John! How are you?' },
}

test('Twilio success with minimal parameters.', async () => {
  mockResponse(200, JSON.stringify({ sid: 'returned-id' }))
  const result = await sdk.send(request)
  expect(mockHttp).toHaveBeenLastCalledWith(
    expect.objectContaining({
      hostname: 'api.twilio.com',
      method: 'POST',
      path: '/2010-04-01/Accounts/account/Messages.json',
      protocol: 'https:',
      href: 'https://api.twilio.com/2010-04-01/Accounts/account/Messages.json',
      headers: expect.objectContaining({
        Accept: ['*/*'],
        Authorization: ['Basic YWNjb3VudDp0b2tlbg=='],
        'Content-Type': [expect.stringContaining('multipart/form-data; boundary=')],
        'User-Agent': ['webventures-comms/v2 (+https://github.com/cryptventure/comms)'],
      }),
    })
  )
  expect(result).toEqual({
    status: 'success',
    channels: {
      sms: { id: 'returned-id', providerId: 'sms-twilio-provider' },
    },
  })
})

test('Twilio success with all parameters.', async () => {
  mockResponse(200, JSON.stringify({ sid: 'returned-id' }))
  const completeRequest = {
    metadata: { id: '24' },
    sms: {
      from: 'Notifme',
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
      hostname: 'api.twilio.com',
      method: 'POST',
      path: '/2010-04-01/Accounts/account/Messages.json',
      protocol: 'https:',
      href: 'https://api.twilio.com/2010-04-01/Accounts/account/Messages.json',
      headers: expect.objectContaining({
        Accept: ['*/*'],
        Authorization: ['Basic YWNjb3VudDp0b2tlbg=='],
        'Content-Type': [expect.stringContaining('multipart/form-data; boundary=')],
        'User-Agent': ['webventures-comms/v2 (+https://github.com/cryptventure/comms)'],
      }),
    })
  )
  expect(result).toEqual({
    status: 'success',
    channels: {
      sms: { id: 'returned-id', providerId: 'sms-twilio-provider' },
    },
  })
})

test('Twilio API error.', async () => {
  mockResponse(400, JSON.stringify({ message: 'error!' }))
  const result = await sdk.send(request)
  expect(result).toEqual({
    status: 'error',
    errors: {
      sms: '400 - error!',
    },
    channels: {
      sms: { id: undefined, providerId: 'sms-twilio-provider' },
    },
  })
})
