import { vi, test, expect, describe, beforeEach } from 'vitest'
import PushWnsProvider from '../../../src/providers/push/wns'
import { ConfigurationError, ProviderError } from '../../../src/types/errors'

// Mock node-pushnotifications
vi.mock('node-pushnotifications', () => {
  return {
    default: vi.fn(function () {
      return {
        send: vi.fn(),
      }
    }),
  }
})

describe('WNS Push Provider - Constructor Validation', () => {
  test('throws ConfigurationError when config is missing', () => {
    expect(() => {
      new PushWnsProvider(null as any)
    }).toThrow(ConfigurationError)

    try {
      new PushWnsProvider(null as any)
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError)
      expect((error as ConfigurationError).code).toBe('WNS_CONFIG_MISSING')
      expect((error as ConfigurationError).message).toBe('WNS provider requires configuration')
    }
  })

  test('throws ConfigurationError when clientId is missing', () => {
    expect(() => {
      new PushWnsProvider({
        clientId: '',
        clientSecret: 'secret',
        notificationMethod: 'sendTileSquareBlock',
      })
    }).toThrow(ConfigurationError)

    try {
      new PushWnsProvider({
        clientId: '',
        clientSecret: 'secret',
        notificationMethod: 'sendTileSquareBlock',
      })
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError)
      expect((error as ConfigurationError).code).toBe('WNS_CREDENTIALS_MISSING')
      expect((error as ConfigurationError).message).toContain('requires clientId and clientSecret')
    }
  })

  test('throws ConfigurationError when clientSecret is missing', () => {
    expect(() => {
      new PushWnsProvider({
        clientId: 'client-id',
        clientSecret: '',
        notificationMethod: 'sendTileSquareBlock',
      })
    }).toThrow(ConfigurationError)

    try {
      new PushWnsProvider({
        clientId: 'client-id',
        clientSecret: '',
        notificationMethod: 'sendTileSquareBlock',
      })
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError)
      expect((error as ConfigurationError).code).toBe('WNS_CREDENTIALS_MISSING')
    }
  })

  test('throws ConfigurationError when notificationMethod is missing', () => {
    expect(() => {
      new PushWnsProvider({
        clientId: 'client-id',
        clientSecret: 'secret',
        notificationMethod: '',
      })
    }).toThrow(ConfigurationError)

    try {
      new PushWnsProvider({
        clientId: 'client-id',
        clientSecret: 'secret',
        notificationMethod: '',
      })
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError)
      expect((error as ConfigurationError).code).toBe('WNS_METHOD_MISSING')
      expect((error as ConfigurationError).message).toContain(
        'requires notificationMethod in configuration'
      )
    }
  })

  test('throws ConfigurationError when all required fields are missing', () => {
    expect(() => {
      new PushWnsProvider({} as any)
    }).toThrow(ConfigurationError)

    try {
      new PushWnsProvider({} as any)
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError)
      expect((error as ConfigurationError).code).toBe('WNS_CREDENTIALS_MISSING')
    }
  })

  test('creates provider successfully with valid config', () => {
    const provider = new PushWnsProvider({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      notificationMethod: 'sendTileSquareBlock',
    })
    expect(provider.id).toBe('push-wns-provider')
  })

  test('creates provider with toast notification method', () => {
    const provider = new PushWnsProvider({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      notificationMethod: 'sendToastText01',
    })
    expect(provider.id).toBe('push-wns-provider')
  })

  test('creates provider with badge notification method', () => {
    const provider = new PushWnsProvider({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      notificationMethod: 'sendBadge',
    })
    expect(provider.id).toBe('push-wns-provider')
  })

  test('creates provider with accessTokenExpiry option', () => {
    const provider = new PushWnsProvider({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      notificationMethod: 'sendTileSquareBlock',
      accessTokenExpiry: 3600,
    })
    expect(provider.id).toBe('push-wns-provider')
  })
})

describe('WNS Push Provider - Send Method', () => {
  let mockSend: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockSend = vi.fn()
  })

  test('throws ProviderError when registrationToken is missing', async () => {
    const provider = new PushWnsProvider({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      notificationMethod: 'sendTileSquareBlock',
    })

    await expect(
      provider.send({
        // @ts-expect-error - Testing invalid input
        registrationToken: '',
        title: 'Test',
        body: 'Test message',
      })
    ).rejects.toThrow(ProviderError)

    try {
      await provider.send({
        // @ts-expect-error - Testing invalid input
        registrationToken: '',
        title: 'Test',
        body: 'Test message',
      })
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError)
      expect((error as ProviderError).code).toBe('MISSING_REGISTRATION_TOKEN')
      expect((error as ProviderError).providerId).toBe('push-wns-provider')
      expect((error as ProviderError).channel).toBe('push')
    }
  })

  test('sends notification successfully', async () => {
    const provider = new PushWnsProvider({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      notificationMethod: 'sendTileSquareBlock',
    })

    // Mock successful response
    mockSend = vi.fn().mockResolvedValue([
      {
        success: 1,
        failure: 0,
        message: [{ messageId: 'wns-message-id-123' }],
      },
    ])
    ;(provider as any).transporter = { send: mockSend }

    const messageId = await provider.send({
      registrationToken: 'https://cloud.notify.windows.com/?token=channel-uri',
      title: 'Test Notification',
      body: 'Hello from WNS!',
    })

    expect(mockSend).toHaveBeenCalledWith(['https://cloud.notify.windows.com/?token=channel-uri'], {
      title: 'Test Notification',
      body: 'Hello from WNS!',
    })
    expect(messageId).toBe('wns-message-id-123')
  })

  test('sends notification with all parameters', async () => {
    const provider = new PushWnsProvider({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      notificationMethod: 'sendToastText01',
    })

    mockSend = vi.fn().mockResolvedValue([
      {
        success: 1,
        failure: 0,
        message: [{ messageId: 'wns-message-id-456' }],
      },
    ])
    ;(provider as any).transporter = { send: mockSend }

    const messageId = await provider.send({
      registrationToken: 'https://cloud.notify.windows.com/?token=channel-uri',
      title: 'New Message',
      body: 'You have a new message',
      custom: { userId: '123', action: 'view' },
      launch: 'action=viewMessage&messageId=123',
      duration: 'long',
      headers: {
        'X-WNS-Tag': 'message-tag',
      },
    })

    expect(mockSend).toHaveBeenCalledWith(
      ['https://cloud.notify.windows.com/?token=channel-uri'],
      expect.objectContaining({
        title: 'New Message',
        body: 'You have a new message',
        custom: { userId: '123', action: 'view' },
        launch: 'action=viewMessage&messageId=123',
        duration: 'long',
        headers: {
          'X-WNS-Tag': 'message-tag',
        },
      })
    )
    expect(messageId).toBe('wns-message-id-456')
  })

  test('applies customize function when provided', async () => {
    const provider = new PushWnsProvider({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      notificationMethod: 'sendTileSquareBlock',
    })

    mockSend = vi.fn().mockResolvedValue([
      {
        success: 1,
        failure: 0,
        message: [{ messageId: 'wns-custom-id' }],
      },
    ])
    ;(provider as any).transporter = { send: mockSend }

    await provider.send({
      registrationToken: 'https://cloud.notify.windows.com/?token=channel-uri',
      title: 'Original Title',
      body: 'Original Body',
      customize: async (providerId, request) => ({
        ...request,
        title: 'Customized Title',
        body: 'Customized Body',
      }),
    })

    expect(mockSend).toHaveBeenCalledWith(
      ['https://cloud.notify.windows.com/?token=channel-uri'],
      expect.objectContaining({
        title: 'Customized Title',
        body: 'Customized Body',
      })
    )
  })

  test('returns success when messageId is not in response', async () => {
    const provider = new PushWnsProvider({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      notificationMethod: 'sendTileSquareBlock',
    })

    mockSend = vi.fn().mockResolvedValue([
      {
        success: 1,
        failure: 0,
        message: [{}], // No messageId
      },
    ])
    ;(provider as any).transporter = { send: mockSend }

    const messageId = await provider.send({
      registrationToken: 'https://cloud.notify.windows.com/?token=channel-uri',
      title: 'Test',
      body: 'Test',
    })

    expect(messageId).toBe('success')
  })

  test('throws ProviderError when no response received', async () => {
    const provider = new PushWnsProvider({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      notificationMethod: 'sendTileSquareBlock',
    })

    mockSend = vi.fn().mockResolvedValue([])
    ;(provider as any).transporter = { send: mockSend }

    await expect(
      provider.send({
        registrationToken: 'https://cloud.notify.windows.com/?token=channel-uri',
        title: 'Test',
        body: 'Test',
      })
    ).rejects.toThrow('No response received from WNS')
  })

  test('throws ProviderError when result is empty', async () => {
    const provider = new PushWnsProvider({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      notificationMethod: 'sendTileSquareBlock',
    })

    mockSend = vi.fn().mockResolvedValue([null])
    ;(provider as any).transporter = { send: mockSend }

    await expect(
      provider.send({
        registrationToken: 'https://cloud.notify.windows.com/?token=channel-uri',
        title: 'Test',
        body: 'Test',
      })
    ).rejects.toThrow('Empty result received from WNS')
  })

  test('throws ProviderError when WNS returns failure', async () => {
    const provider = new PushWnsProvider({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      notificationMethod: 'sendTileSquareBlock',
    })

    mockSend = vi.fn().mockResolvedValue([
      {
        success: 0,
        failure: 1,
        message: [{ error: 'ChannelExpired' }],
      },
    ])
    ;(provider as any).transporter = { send: mockSend }

    await expect(
      provider.send({
        registrationToken: 'invalid-channel-uri',
        title: 'Test',
        body: 'Test',
      })
    ).rejects.toThrow('WNS notification failed: ChannelExpired')

    try {
      await provider.send({
        registrationToken: 'invalid-channel-uri',
        title: 'Test',
        body: 'Test',
      })
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError)
      expect((error as ProviderError).code).toBe('WNS_SEND_FAILED')
      expect((error as ProviderError).channel).toBe('push')
    }
  })

  test('throws ProviderError when send throws an error', async () => {
    const provider = new PushWnsProvider({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      notificationMethod: 'sendTileSquareBlock',
    })

    mockSend = vi.fn().mockRejectedValue(new Error('Network error'))
    ;(provider as any).transporter = { send: mockSend }

    await expect(
      provider.send({
        registrationToken: 'https://cloud.notify.windows.com/?token=channel-uri',
        title: 'Test',
        body: 'Test',
      })
    ).rejects.toThrow('Failed to send WNS notification: Network error')

    try {
      await provider.send({
        registrationToken: 'https://cloud.notify.windows.com/?token=channel-uri',
        title: 'Test',
        body: 'Test',
      })
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError)
      expect((error as ProviderError).code).toBe('SEND_ERROR')
    }
  })

  test('handles WNS failure with missing error message', async () => {
    const provider = new PushWnsProvider({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      notificationMethod: 'sendTileSquareBlock',
    })

    mockSend = vi.fn().mockResolvedValue([
      {
        success: 0,
        failure: 1,
        message: [{}], // No error field
      },
    ])
    ;(provider as any).transporter = { send: mockSend }

    await expect(
      provider.send({
        registrationToken: 'https://cloud.notify.windows.com/?token=channel-uri',
        title: 'Test',
        body: 'Test',
      })
    ).rejects.toThrow('WNS notification failed: Unknown WNS error')
  })

  test('sends tile notification', async () => {
    const provider = new PushWnsProvider({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      notificationMethod: 'sendTileWideText01',
    })

    mockSend = vi.fn().mockResolvedValue([
      {
        success: 1,
        failure: 0,
        message: [{ messageId: 'wns-tile-id' }],
      },
    ])
    ;(provider as any).transporter = { send: mockSend }

    const messageId = await provider.send({
      registrationToken: 'https://cloud.notify.windows.com/?token=channel-uri',
      title: 'Tile Title',
      body: 'Tile content',
    })

    expect(messageId).toBe('wns-tile-id')
  })

  test('sends badge notification', async () => {
    const provider = new PushWnsProvider({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      notificationMethod: 'sendBadge',
    })

    mockSend = vi.fn().mockResolvedValue([
      {
        success: 1,
        failure: 0,
        message: [{ messageId: 'wns-badge-id' }],
      },
    ])
    ;(provider as any).transporter = { send: mockSend }

    const messageId = await provider.send({
      registrationToken: 'https://cloud.notify.windows.com/?token=channel-uri',
      title: 'Badge Update',
      body: 'Badge notification',
      badge: 5,
    })

    expect(messageId).toBe('wns-badge-id')
  })
})
