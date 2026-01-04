import { vi, test, expect } from 'vitest'
import CommsSdk from '../../../src'
import webpush from 'web-push'

vi.mock('web-push')
vi.mock('../../../src/util/logger', () => ({
  default: {
    warn: vi.fn(),
  },
}))
;(webpush.sendNotification as any).mockReturnValue({ headers: { location: 'returned-id' } })

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
