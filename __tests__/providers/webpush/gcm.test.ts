import { vi, test, expect, describe } from 'vitest'
import CommsSdk from '../../../src'
import WebpushGcmProvider from '../../../src/providers/webpush/gcm'
import { ProviderError } from '../../../src/types/errors'
import webpush from 'web-push'

vi.mock('web-push')
vi.mock('../../../src/util/logger', () => ({
  default: {
    warn: vi.fn(),
  },
}))
;(webpush.sendNotification as any).mockReturnValue({ headers: { location: 'returned-id' } })

describe('GCM Webpush Provider - Constructor Validation', () => {
  test('throws ProviderError when neither gcmAPIKey nor vapidDetails is provided', () => {
    expect(() => {
      new WebpushGcmProvider({})
    }).toThrow(ProviderError)

    try {
      new WebpushGcmProvider({})
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError)
      expect((error as ProviderError).code).toBe('MISSING_CONFIG')
      expect((error as ProviderError).providerId).toBe('webpush-gcm-provider')
      expect((error as ProviderError).channel).toBe('webpush')
      expect((error as ProviderError).message).toContain('gcmAPIKey or vapidDetails')
    }
  })

  test('throws ProviderError when vapidDetails is incomplete (missing subject)', () => {
    expect(() => {
      new WebpushGcmProvider({
        vapidDetails: { subject: '', publicKey: 'pub', privateKey: 'priv' },
      })
    }).toThrow(ProviderError)
  })

  test('throws ProviderError when vapidDetails is incomplete (missing publicKey)', () => {
    expect(() => {
      new WebpushGcmProvider({
        vapidDetails: { subject: 'mailto:test@example.com', publicKey: '', privateKey: 'priv' },
      })
    }).toThrow(ProviderError)
  })

  test('throws ProviderError when vapidDetails is incomplete (missing privateKey)', () => {
    expect(() => {
      new WebpushGcmProvider({
        vapidDetails: { subject: 'mailto:test@example.com', publicKey: 'pub', privateKey: '' },
      })
    }).toThrow(ProviderError)
  })

  test('creates provider successfully with gcmAPIKey', () => {
    const provider = new WebpushGcmProvider({ gcmAPIKey: 'test-api-key' })
    expect(provider.id).toBe('webpush-gcm-provider')
  })

  test('creates provider successfully with complete vapidDetails', () => {
    const provider = new WebpushGcmProvider({
      vapidDetails: { subject: 'mailto:test@example.com', publicKey: 'pub', privateKey: 'priv' },
    })
    expect(provider.id).toBe('webpush-gcm-provider')
  })
})

const request = {
  webpush: {
    subscription: {
      keys: {
        auth: 'xxxxx',
        p256dh: 'xxxxx',
      },
      endpoint: 'xxxxx',
    },
    title: 'Hi John',
    body: 'Hello John! How are you?',
    icon: 'https://webventures.github.io/comms/img/icon.png',
  },
}

test('GCM with API key.', async () => {
  const sdk = new CommsSdk({
    channels: {
      webpush: {
        providers: [
          {
            type: 'gcm',
            gcmAPIKey: 'xxxxx',
          },
        ],
      },
    },
  })
  const result = await sdk.send(request)
  expect(webpush.setGCMAPIKey).toHaveBeenLastCalledWith('xxxxx')
  expect(webpush.sendNotification).toHaveBeenLastCalledWith(
    request.webpush.subscription,
    '{"title":"Hi John","body":"Hello John! How are you?","icon":"https://webventures.github.io/comms/img/icon.png"}',
    { TTL: undefined, headers: undefined }
  )
  expect(result).toEqual({
    status: 'success',
    channels: {
      webpush: { id: 'returned-id', providerId: 'webpush-gcm-provider' },
    },
  })
})

test('GCM with vapid.', async () => {
  const sdk = new CommsSdk({
    channels: {
      webpush: {
        providers: [
          {
            type: 'gcm',
            vapidDetails: { subject: 'xxxx', publicKey: 'xxxxx', privateKey: 'xxxxxx' },
          },
        ],
      },
    },
  })
  const result = await sdk.send(request)
  expect(webpush.setVapidDetails).toHaveBeenLastCalledWith('xxxx', 'xxxxx', 'xxxxxx')
  expect(webpush.sendNotification).toHaveBeenLastCalledWith(
    request.webpush.subscription,
    '{"title":"Hi John","body":"Hello John! How are you?","icon":"https://webventures.github.io/comms/img/icon.png"}',
    { TTL: undefined, headers: undefined }
  )
  expect(result).toEqual({
    status: 'success',
    channels: {
      webpush: { id: 'returned-id', providerId: 'webpush-gcm-provider' },
    },
  })
})

test('GCM should customize requests.', async () => {
  const sdk = new CommsSdk({
    channels: {
      webpush: {
        providers: [
          {
            type: 'gcm',
            vapidDetails: { subject: 'xxxx', publicKey: 'xxxxx', privateKey: 'xxxxxx' },
          },
        ],
      },
    },
  })
  await sdk.send({
    webpush: {
      ...request.webpush,
      customize: async (provider: string, request: any) => ({ ...request, title: 'Hi John!' }),
    },
  })
  expect(webpush.sendNotification).toHaveBeenLastCalledWith(
    request.webpush.subscription,
    '{"title":"Hi John!","body":"Hello John! How are you?","icon":"https://webventures.github.io/comms/img/icon.png"}',
    { TTL: undefined, headers: undefined }
  )
})
