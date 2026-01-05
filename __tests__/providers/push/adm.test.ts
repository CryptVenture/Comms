import { vi, test, expect, describe, beforeEach } from 'vitest'
import PushAdmProvider from '../../../src/providers/push/adm'
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

describe('ADM Push Provider - Constructor Validation', () => {
  test('throws ConfigurationError when config is missing', () => {
    expect(() => {
      new PushAdmProvider(null as any)
    }).toThrow(ConfigurationError)

    try {
      new PushAdmProvider(null as any)
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError)
      expect((error as ConfigurationError).code).toBe('ADM_CONFIG_MISSING')
      expect((error as ConfigurationError).message).toBe('ADM provider requires configuration')
    }
  })

  test('throws ConfigurationError when clientId is missing', () => {
    expect(() => {
      new PushAdmProvider({
        clientId: '',
        clientSecret: 'secret',
      })
    }).toThrow(ConfigurationError)

    try {
      new PushAdmProvider({
        clientId: '',
        clientSecret: 'secret',
      })
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError)
      expect((error as ConfigurationError).code).toBe('ADM_CREDENTIALS_MISSING')
      expect((error as ConfigurationError).message).toContain('requires clientId and clientSecret')
    }
  })

  test('throws ConfigurationError when clientSecret is missing', () => {
    expect(() => {
      new PushAdmProvider({
        clientId: 'client-id',
        clientSecret: '',
      })
    }).toThrow(ConfigurationError)

    try {
      new PushAdmProvider({
        clientId: 'client-id',
        clientSecret: '',
      })
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError)
      expect((error as ConfigurationError).code).toBe('ADM_CREDENTIALS_MISSING')
      expect((error as ConfigurationError).message).toContain('requires clientId and clientSecret')
    }
  })

  test('throws ConfigurationError when both credentials are missing', () => {
    expect(() => {
      new PushAdmProvider({} as any)
    }).toThrow(ConfigurationError)

    try {
      new PushAdmProvider({} as any)
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError)
      expect((error as ConfigurationError).code).toBe('ADM_CREDENTIALS_MISSING')
    }
  })

  test('creates provider successfully with valid config', () => {
    const provider = new PushAdmProvider({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
    })
    expect(provider.id).toBe('push-adm-provider')
  })

  test('creates provider with accessTokenExpiry option', () => {
    const provider = new PushAdmProvider({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      accessTokenExpiry: 7200,
    })
    expect(provider.id).toBe('push-adm-provider')
  })
})

describe('ADM Push Provider - Send Method', () => {
  let mockSend: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockSend = vi.fn()
  })

  test('throws ProviderError when registrationToken is missing', async () => {
    const provider = new PushAdmProvider({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
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
      expect((error as ProviderError).providerId).toBe('push-adm-provider')
      expect((error as ProviderError).channel).toBe('push')
    }
  })

  test('sends notification successfully', async () => {
    const provider = new PushAdmProvider({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
    })

    // Mock successful response
    mockSend = vi.fn().mockResolvedValue([
      {
        success: 1,
        failure: 0,
        message: [{ messageId: 'adm-message-id-123' }],
      },
    ])
    ;(provider as any).transporter = { send: mockSend }

    const messageId = await provider.send({
      registrationToken: 'amzn1.adm-registration.device-token',
      title: 'Test Notification',
      body: 'Hello from ADM!',
    })

    expect(mockSend).toHaveBeenCalledWith(['amzn1.adm-registration.device-token'], {
      title: 'Test Notification',
      body: 'Hello from ADM!',
    })
    expect(messageId).toBe('adm-message-id-123')
  })

  test('sends notification with all parameters', async () => {
    const provider = new PushAdmProvider({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
    })

    mockSend = vi.fn().mockResolvedValue([
      {
        success: 1,
        failure: 0,
        message: [{ messageId: 'adm-message-id-456' }],
      },
    ])
    ;(provider as any).transporter = { send: mockSend }

    const messageId = await provider.send({
      registrationToken: 'amzn1.adm-registration.device-token',
      title: 'New Message',
      body: 'You have a new message',
      custom: { userId: '123', action: 'view' },
      consolidationKey: 'messages',
      timeToLive: 604800,
      sound: 'default',
    })

    expect(mockSend).toHaveBeenCalledWith(
      ['amzn1.adm-registration.device-token'],
      expect.objectContaining({
        title: 'New Message',
        body: 'You have a new message',
        custom: { userId: '123', action: 'view' },
        consolidationKey: 'messages',
        timeToLive: 604800,
        sound: 'default',
      })
    )
    expect(messageId).toBe('adm-message-id-456')
  })

  test('applies customize function when provided', async () => {
    const provider = new PushAdmProvider({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
    })

    mockSend = vi.fn().mockResolvedValue([
      {
        success: 1,
        failure: 0,
        message: [{ messageId: 'adm-custom-id' }],
      },
    ])
    ;(provider as any).transporter = { send: mockSend }

    await provider.send({
      registrationToken: 'amzn1.adm-registration.device-token',
      title: 'Original Title',
      body: 'Original Body',
      customize: async (providerId, request) => ({
        ...request,
        title: 'Customized Title',
        body: 'Customized Body',
      }),
    })

    expect(mockSend).toHaveBeenCalledWith(
      ['amzn1.adm-registration.device-token'],
      expect.objectContaining({
        title: 'Customized Title',
        body: 'Customized Body',
      })
    )
  })

  test('returns success when messageId is not in response', async () => {
    const provider = new PushAdmProvider({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
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
      registrationToken: 'amzn1.adm-registration.device-token',
      title: 'Test',
      body: 'Test',
    })

    expect(messageId).toBe('success')
  })

  test('throws ProviderError when no response received', async () => {
    const provider = new PushAdmProvider({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
    })

    mockSend = vi.fn().mockResolvedValue([])
    ;(provider as any).transporter = { send: mockSend }

    await expect(
      provider.send({
        registrationToken: 'amzn1.adm-registration.device-token',
        title: 'Test',
        body: 'Test',
      })
    ).rejects.toThrow('No response received from ADM')
  })

  test('throws ProviderError when result is empty', async () => {
    const provider = new PushAdmProvider({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
    })

    mockSend = vi.fn().mockResolvedValue([null])
    ;(provider as any).transporter = { send: mockSend }

    await expect(
      provider.send({
        registrationToken: 'amzn1.adm-registration.device-token',
        title: 'Test',
        body: 'Test',
      })
    ).rejects.toThrow('Empty result received from ADM')
  })

  test('throws ProviderError when ADM returns failure', async () => {
    const provider = new PushAdmProvider({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
    })

    mockSend = vi.fn().mockResolvedValue([
      {
        success: 0,
        failure: 1,
        message: [{ error: 'InvalidRegistrationId' }],
      },
    ])
    ;(provider as any).transporter = { send: mockSend }

    await expect(
      provider.send({
        registrationToken: 'invalid-token',
        title: 'Test',
        body: 'Test',
      })
    ).rejects.toThrow('ADM notification failed: InvalidRegistrationId')

    try {
      await provider.send({
        registrationToken: 'invalid-token',
        title: 'Test',
        body: 'Test',
      })
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError)
      expect((error as ProviderError).code).toBe('ADM_SEND_FAILED')
      expect((error as ProviderError).channel).toBe('push')
    }
  })

  test('throws ProviderError when send throws an error', async () => {
    const provider = new PushAdmProvider({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
    })

    mockSend = vi.fn().mockRejectedValue(new Error('Network error'))
    ;(provider as any).transporter = { send: mockSend }

    await expect(
      provider.send({
        registrationToken: 'amzn1.adm-registration.device-token',
        title: 'Test',
        body: 'Test',
      })
    ).rejects.toThrow('Failed to send ADM notification: Network error')

    try {
      await provider.send({
        registrationToken: 'amzn1.adm-registration.device-token',
        title: 'Test',
        body: 'Test',
      })
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError)
      expect((error as ProviderError).code).toBe('SEND_ERROR')
    }
  })

  test('handles ADM failure with missing error message', async () => {
    const provider = new PushAdmProvider({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
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
        registrationToken: 'amzn1.adm-registration.device-token',
        title: 'Test',
        body: 'Test',
      })
    ).rejects.toThrow('ADM notification failed: Unknown ADM error')
  })
})
