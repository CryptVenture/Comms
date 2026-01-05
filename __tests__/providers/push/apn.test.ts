import { vi, test, expect, describe, beforeEach } from 'vitest'
import PushApnProvider from '../../../src/providers/push/apn'
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

describe('APN Push Provider - Constructor Validation', () => {
  test('throws ConfigurationError when config is missing', () => {
    expect(() => {
      new PushApnProvider(null as any)
    }).toThrow(ConfigurationError)

    try {
      new PushApnProvider(null as any)
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError)
      expect((error as ConfigurationError).code).toBe('APN_CONFIG_MISSING')
      expect((error as ConfigurationError).message).toBe('APN provider requires configuration')
    }
  })

  test('throws ConfigurationError when no authentication method is provided', () => {
    expect(() => {
      new PushApnProvider({} as any)
    }).toThrow(ConfigurationError)

    try {
      new PushApnProvider({} as any)
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError)
      expect((error as ConfigurationError).code).toBe('APN_AUTH_MISSING')
      expect((error as ConfigurationError).message).toContain(
        'requires either token authentication'
      )
    }
  })

  test('throws ConfigurationError when token authentication is incomplete', () => {
    expect(() => {
      new PushApnProvider({
        token: {
          key: 'test-key',
          keyId: 'ABC123',
          // teamId missing
        } as any,
      })
    }).toThrow(ConfigurationError)

    expect(() => {
      new PushApnProvider({
        token: {
          key: 'test-key',
          // keyId missing
          teamId: 'DEF456',
        } as any,
      })
    }).toThrow(ConfigurationError)

    expect(() => {
      new PushApnProvider({
        token: {
          // key missing
          keyId: 'ABC123',
          teamId: 'DEF456',
        } as any,
      })
    }).toThrow(ConfigurationError)
  })

  test('creates provider successfully with token authentication', () => {
    const provider = new PushApnProvider({
      token: {
        key: './AuthKey_ABC123.p8',
        keyId: 'ABC123',
        teamId: 'DEF456',
      },
      production: true,
    })
    expect(provider.id).toBe('push-apn-provider')
  })

  test('creates provider successfully with certificate authentication', () => {
    const provider = new PushApnProvider({
      cert: './cert.pem',
      key: './key.pem',
      production: true,
    })
    expect(provider.id).toBe('push-apn-provider')
  })

  test('throws ConfigurationError when certificate authentication is incomplete', () => {
    expect(() => {
      new PushApnProvider({
        cert: './cert.pem',
        // key missing
      } as any)
    }).toThrow(ConfigurationError)

    expect(() => {
      new PushApnProvider({
        // cert missing
        key: './key.pem',
      } as any)
    }).toThrow(ConfigurationError)
  })

  test('creates provider successfully with pfx authentication', () => {
    const provider = new PushApnProvider({
      pfx: './cert.pfx',
      passphrase: 'secret',
      production: true,
    })
    expect(provider.id).toBe('push-apn-provider')
  })

  test('converts ca array format correctly', () => {
    const provider = new PushApnProvider({
      token: {
        key: './AuthKey_ABC123.p8',
        keyId: 'ABC123',
        teamId: 'DEF456',
      },
      ca: [{ filename: './ca.pem' }],
    })
    expect(provider.id).toBe('push-apn-provider')
  })

  test('creates provider with all optional parameters', () => {
    const provider = new PushApnProvider({
      token: {
        key: './AuthKey_ABC123.p8',
        keyId: 'ABC123',
        teamId: 'DEF456',
      },
      production: true,
      rejectUnauthorized: true,
      connectionRetryLimit: 5,
    })
    expect(provider.id).toBe('push-apn-provider')
  })
})

describe('APN Push Provider - Send Method', () => {
  let mockSend: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockSend = vi.fn()
  })

  test('throws ProviderError when registrationToken is missing', async () => {
    const provider = new PushApnProvider({
      token: {
        key: './AuthKey_ABC123.p8',
        keyId: 'ABC123',
        teamId: 'DEF456',
      },
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
      expect((error as ProviderError).providerId).toBe('push-apn-provider')
      expect((error as ProviderError).channel).toBe('push')
    }
  })

  test('sends notification successfully', async () => {
    const provider = new PushApnProvider({
      token: {
        key: './AuthKey_ABC123.p8',
        keyId: 'ABC123',
        teamId: 'DEF456',
      },
    })

    // Mock successful response
    mockSend = vi.fn().mockResolvedValue([
      {
        success: 1,
        failure: 0,
        message: [{ messageId: 'apn-message-id-123' }],
      },
    ])
    ;(provider as any).transporter = { send: mockSend }

    const messageId = await provider.send({
      registrationToken: 'device-token',
      title: 'Test Notification',
      body: 'Hello from APN!',
      priority: 'high',
      badge: 5,
    })

    expect(mockSend).toHaveBeenCalledWith(['device-token'], {
      title: 'Test Notification',
      body: 'Hello from APN!',
      priority: 'high',
      badge: 5,
    })
    expect(messageId).toBe('apn-message-id-123')
  })

  test('sends notification with all parameters', async () => {
    const provider = new PushApnProvider({
      token: {
        key: './AuthKey_ABC123.p8',
        keyId: 'ABC123',
        teamId: 'DEF456',
      },
    })

    mockSend = vi.fn().mockResolvedValue([
      {
        success: 1,
        failure: 0,
        message: [{ messageId: 'apn-message-id-456' }],
      },
    ])
    ;(provider as any).transporter = { send: mockSend }

    const messageId = await provider.send({
      registrationToken: 'device-token',
      title: 'New Message',
      body: 'You have a new message',
      custom: { userId: '123', action: 'view' },
      priority: 'high',
      badge: 10,
      sound: 'notification.aiff',
      topic: 'com.example.app',
      category: 'MESSAGE_CATEGORY',
      mutableContent: 1,
      expiry: 3600,
    })

    expect(mockSend).toHaveBeenCalledWith(
      ['device-token'],
      expect.objectContaining({
        title: 'New Message',
        body: 'You have a new message',
        custom: { userId: '123', action: 'view' },
        priority: 'high',
        badge: 10,
        sound: 'notification.aiff',
        topic: 'com.example.app',
        category: 'MESSAGE_CATEGORY',
        mutableContent: 1,
        expiry: 3600,
      })
    )
    expect(messageId).toBe('apn-message-id-456')
  })

  test('applies customize function when provided', async () => {
    const provider = new PushApnProvider({
      token: {
        key: './AuthKey_ABC123.p8',
        keyId: 'ABC123',
        teamId: 'DEF456',
      },
    })

    mockSend = vi.fn().mockResolvedValue([
      {
        success: 1,
        failure: 0,
        message: [{ messageId: 'apn-custom-id' }],
      },
    ])
    ;(provider as any).transporter = { send: mockSend }

    await provider.send({
      registrationToken: 'device-token',
      title: 'Original Title',
      body: 'Original Body',
      customize: async (providerId, request) => ({
        ...request,
        title: 'Customized Title',
        body: 'Customized Body',
      }),
    })

    expect(mockSend).toHaveBeenCalledWith(
      ['device-token'],
      expect.objectContaining({
        title: 'Customized Title',
        body: 'Customized Body',
      })
    )
  })

  test('returns success when messageId is not in response', async () => {
    const provider = new PushApnProvider({
      token: {
        key: './AuthKey_ABC123.p8',
        keyId: 'ABC123',
        teamId: 'DEF456',
      },
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
      registrationToken: 'device-token',
      title: 'Test',
      body: 'Test',
    })

    expect(messageId).toBe('success')
  })

  test('throws ProviderError when no response received', async () => {
    const provider = new PushApnProvider({
      token: {
        key: './AuthKey_ABC123.p8',
        keyId: 'ABC123',
        teamId: 'DEF456',
      },
    })

    mockSend = vi.fn().mockResolvedValue([])
    ;(provider as any).transporter = { send: mockSend }

    await expect(
      provider.send({
        registrationToken: 'device-token',
        title: 'Test',
        body: 'Test',
      })
    ).rejects.toThrow('No response received from APN')
  })

  test('throws ProviderError when result is empty', async () => {
    const provider = new PushApnProvider({
      token: {
        key: './AuthKey_ABC123.p8',
        keyId: 'ABC123',
        teamId: 'DEF456',
      },
    })

    mockSend = vi.fn().mockResolvedValue([null])
    ;(provider as any).transporter = { send: mockSend }

    await expect(
      provider.send({
        registrationToken: 'device-token',
        title: 'Test',
        body: 'Test',
      })
    ).rejects.toThrow('Empty result received from APN')
  })

  test('throws ProviderError when APN returns failure', async () => {
    const provider = new PushApnProvider({
      token: {
        key: './AuthKey_ABC123.p8',
        keyId: 'ABC123',
        teamId: 'DEF456',
      },
    })

    mockSend = vi.fn().mockResolvedValue([
      {
        success: 0,
        failure: 1,
        message: [{ error: 'InvalidToken' }],
      },
    ])
    ;(provider as any).transporter = { send: mockSend }

    await expect(
      provider.send({
        registrationToken: 'invalid-token',
        title: 'Test',
        body: 'Test',
      })
    ).rejects.toThrow('APN notification failed: InvalidToken')

    try {
      await provider.send({
        registrationToken: 'invalid-token',
        title: 'Test',
        body: 'Test',
      })
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError)
      expect((error as ProviderError).code).toBe('APN_SEND_FAILED')
      expect((error as ProviderError).channel).toBe('push')
    }
  })

  test('throws ProviderError when send throws an error', async () => {
    const provider = new PushApnProvider({
      token: {
        key: './AuthKey_ABC123.p8',
        keyId: 'ABC123',
        teamId: 'DEF456',
      },
    })

    mockSend = vi.fn().mockRejectedValue(new Error('Network error'))
    ;(provider as any).transporter = { send: mockSend }

    await expect(
      provider.send({
        registrationToken: 'device-token',
        title: 'Test',
        body: 'Test',
      })
    ).rejects.toThrow('Failed to send APN notification: Network error')

    try {
      await provider.send({
        registrationToken: 'device-token',
        title: 'Test',
        body: 'Test',
      })
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError)
      expect((error as ProviderError).code).toBe('SEND_ERROR')
    }
  })

  test('handles APN failure with missing error message', async () => {
    const provider = new PushApnProvider({
      token: {
        key: './AuthKey_ABC123.p8',
        keyId: 'ABC123',
        teamId: 'DEF456',
      },
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
        registrationToken: 'device-token',
        title: 'Test',
        body: 'Test',
      })
    ).rejects.toThrow('APN notification failed: Unknown APN error')
  })

  test('sends notification with pfx authentication', async () => {
    const provider = new PushApnProvider({
      pfx: './cert.pfx',
      passphrase: 'secret',
      production: true,
    })

    mockSend = vi.fn().mockResolvedValue([
      {
        success: 1,
        failure: 0,
        message: [{ messageId: 'apn-pfx-id' }],
      },
    ])
    ;(provider as any).transporter = { send: mockSend }

    const messageId = await provider.send({
      registrationToken: 'device-token',
      title: 'Test',
      body: 'Test with PFX',
    })

    expect(messageId).toBe('apn-pfx-id')
  })

  test('sends notification with certificate authentication', async () => {
    const provider = new PushApnProvider({
      cert: './cert.pem',
      key: './key.pem',
      production: true,
    })

    mockSend = vi.fn().mockResolvedValue([
      {
        success: 1,
        failure: 0,
        message: [{ messageId: 'apn-cert-id' }],
      },
    ])
    ;(provider as any).transporter = { send: mockSend }

    const messageId = await provider.send({
      registrationToken: 'device-token',
      title: 'Test',
      body: 'Test with certificate',
    })

    expect(messageId).toBe('apn-cert-id')
  })
})
