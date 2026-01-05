import { vi, test, expect } from 'vitest'
import CommsSdk from '../src'

// Type assertion helper for accessing protected methods in tests
type TestableCommsSdk = CommsSdk & {
  mergeWithDefaultConfig: CommsSdk['mergeWithDefaultConfig' & keyof CommsSdk]
}

const sdk = new CommsSdk({}) as TestableCommsSdk
;(sdk as any).sender = { send: vi.fn() }

test('CommsSdk.send should call internal sender send method.', () => {
  const request = {
    sms: { from: 'WebVentures', to: '+15000000001', text: 'Hello John! How are you?' },
  }
  sdk.send(request)
  expect((sdk as any).sender.send).toBeCalledWith(request)
})

test('mergeWithDefaultConfig should set default config if config is empty.', () => {
  expect((sdk as any).mergeWithDefaultConfig({})).toEqual({
    useNotificationCatcher: false,
    channels: {
      email: {
        multiProviderStrategy: 'fallback',
        providers: [],
      },
      sms: {
        multiProviderStrategy: 'fallback',
        providers: [],
      },
      voice: {
        multiProviderStrategy: 'fallback',
        providers: [],
      },
      slack: {
        multiProviderStrategy: 'fallback',
        providers: [],
      },
      push: {
        multiProviderStrategy: 'fallback',
        providers: [],
      },
      whatsapp: {
        multiProviderStrategy: 'fallback',
        providers: [],
      },
      webpush: {
        multiProviderStrategy: 'fallback',
        providers: [],
      },
      telegram: {
        multiProviderStrategy: 'fallback',
        providers: [],
      },
    },
  })
})

const config = {
  useNotificationCatcher: false,
  channels: {
    email: {
      multiProviderStrategy: 'no-fallback',
      providers: [{ type: 'logger' }],
    },
    sms: {
      multiProviderStrategy: 'no-fallback',
      providers: [{ type: 'logger' }],
    },
    voice: {
      multiProviderStrategy: 'no-fallback',
      providers: [{ type: 'logger' }],
    },
    push: {
      multiProviderStrategy: 'no-fallback',
      providers: [{ type: 'logger' }],
    },
    slack: {
      multiProviderStrategy: 'no-fallback',
      providers: [{ type: 'logger' }],
    },
    whatsapp: {
      multiProviderStrategy: 'no-fallback',
      providers: [{ type: 'logger' }],
    },
    webpush: {
      multiProviderStrategy: 'no-fallback',
      providers: [{ type: 'logger' }],
    },
    telegram: {
      multiProviderStrategy: 'no-fallback',
      providers: [{ type: 'logger' }],
    },
  },
}

test('mergeWithDefaultConfig should use given config if not empty.', () => {
  expect((sdk as any).mergeWithDefaultConfig(config as any)).toEqual(config)
})

test('mergeWithDefaultConfig should merge config with default if not complete.', () => {
  expect(
    (sdk as any).mergeWithDefaultConfig({
      ...config,
      channels: {
        ...config.channels,
        sms: undefined as any,
      },
    } as any)
  ).toEqual({
    ...config,
    channels: {
      ...config.channels,
      sms: {
        multiProviderStrategy: 'fallback',
        providers: [],
      },
    },
  })
})

test('mergeWithDefaultConfig should ignore config if useNotificationCatcher is true.', () => {
  expect((sdk as any).mergeWithDefaultConfig({ ...config, useNotificationCatcher: true })).toEqual({
    useNotificationCatcher: true,
    channels: {
      email: {
        multiProviderStrategy: 'no-fallback',
        providers: [{ type: 'notificationcatcher' }],
      },
      sms: {
        multiProviderStrategy: 'no-fallback',
        providers: [{ type: 'notificationcatcher' }],
      },
      voice: {
        multiProviderStrategy: 'no-fallback',
        providers: [{ type: 'notificationcatcher' }],
      },
      slack: {
        multiProviderStrategy: 'no-fallback',
        providers: [{ type: 'notificationcatcher' }],
      },
      push: {
        multiProviderStrategy: 'no-fallback',
        providers: [{ type: 'notificationcatcher' }],
      },
      whatsapp: {
        multiProviderStrategy: 'no-fallback',
        providers: [{ type: 'notificationcatcher' }],
      },
      webpush: {
        multiProviderStrategy: 'no-fallback',
        providers: [{ type: 'notificationcatcher' }],
      },
      telegram: {
        multiProviderStrategy: 'no-fallback',
        providers: [{ type: 'notificationcatcher' }],
      },
    },
  })
})
