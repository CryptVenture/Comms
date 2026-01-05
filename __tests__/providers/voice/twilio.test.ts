import { vi, test, expect, describe } from 'vitest'
import CommsSdk from '../../../src'
import VoiceTwilioProvider from '../../../src/providers/voice/twilio'
import { ProviderError } from '../../../src/types/errors'
import mockHttp, { mockResponse } from '../mockHttp.test'

vi.mock('../../../src/util/logger', () => ({
  default: {
    warn: vi.fn(),
  },
}))

describe('Twilio Voice Provider - Constructor Validation', () => {
  test('throws ProviderError when accountSid is missing', () => {
    expect(() => {
      new VoiceTwilioProvider({ accountSid: '', authToken: 'token' })
    }).toThrow(ProviderError)

    try {
      new VoiceTwilioProvider({ accountSid: '', authToken: 'token' })
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError)
      expect((error as ProviderError).code).toBe('MISSING_CONFIG')
      expect((error as ProviderError).providerId).toBe('voice-twilio-provider')
      expect((error as ProviderError).channel).toBe('voice')
    }
  })

  test('throws ProviderError when authToken is missing', () => {
    expect(() => {
      new VoiceTwilioProvider({ accountSid: 'account', authToken: '' })
    }).toThrow(ProviderError)

    try {
      new VoiceTwilioProvider({ accountSid: 'account', authToken: '' })
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError)
      expect((error as ProviderError).code).toBe('MISSING_CONFIG')
    }
  })

  test('throws ProviderError when both accountSid and authToken are missing', () => {
    expect(() => {
      new VoiceTwilioProvider({ accountSid: '', authToken: '' })
    }).toThrow(ProviderError)
  })

  test('creates provider successfully with valid config', () => {
    const provider = new VoiceTwilioProvider({ accountSid: 'account', authToken: 'token' })
    expect(provider.id).toBe('voice-twilio-provider')
  })
})

const sdk = new CommsSdk({
  channels: {
    voice: {
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
  voice: { from: 'WebVentures', to: '+15000000001', url: 'https://webventures.github.io/comms' },
}

test('Twilio success with minimal parameters.', async () => {
  mockResponse(200, JSON.stringify({ sid: 'returned-id' }))
  const result = await sdk.send(request)
  expect(mockHttp).toHaveBeenLastCalledWith(
    expect.objectContaining({
      hostname: 'api.twilio.com',
      method: 'POST',
      path: '/2010-04-01/Accounts/account/Calls.json',
      protocol: 'https:',
      href: 'https://api.twilio.com/2010-04-01/Accounts/account/Calls.json',
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
      voice: { id: 'returned-id', providerId: 'voice-twilio-provider' },
    },
  })
})

test('Twilio success with all parameters.', async () => {
  mockResponse(200, JSON.stringify({ sid: 'returned-id' }))
  const result = await sdk.send({
    voice: {
      from: 'Notifme',
      to: '+15000000001',
      url: 'https://notifme.github.io',
      method: 'POST',
      fallbackUrl: 'http://example.com',
      fallbackMethod: 'POST',
      statusCallback: 'http://example.com',
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      sendDigits: 'ww1234',
      machineDetection: 'Enable',
      machineDetectionTimeout: 30,
      timeout: 60,
      customize: async (provider: string, request: any) => ({ ...request, url: 'url...' }),
    } as any,
  })
  expect(mockHttp).toHaveBeenLastCalledWith(
    expect.objectContaining({
      hostname: 'api.twilio.com',
      method: 'POST',
      path: '/2010-04-01/Accounts/account/Calls.json',
      protocol: 'https:',
      href: 'https://api.twilio.com/2010-04-01/Accounts/account/Calls.json',
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
      voice: { id: 'returned-id', providerId: 'voice-twilio-provider' },
    },
  })
})

test('Twilio API error.', async () => {
  mockResponse(400, JSON.stringify({ message: 'error!' }))
  const result = await sdk.send(request)
  expect(result).toEqual({
    status: 'error',
    errors: {
      voice: 'error!',
    },
    channels: {
      voice: { id: undefined, providerId: 'voice-twilio-provider' },
    },
  })
})
