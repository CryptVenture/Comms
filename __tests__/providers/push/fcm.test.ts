import { vi, test, expect, describe, beforeEach } from 'vitest'
import PushFcmProvider from '../../../src/providers/push/fcm'
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

describe('FCM Push Provider - Constructor Validation', () => {
  test('throws ConfigurationError when config is missing', () => {
    expect(() => {
      new PushFcmProvider(null as any)
    }).toThrow(ConfigurationError)

    try {
      new PushFcmProvider(null as any)
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError)
      expect((error as ConfigurationError).code).toBe('FCM_CONFIG_MISSING')
      expect((error as ConfigurationError).message).toBe('FCM provider requires configuration')
    }
  })

  test('throws ConfigurationError when id is missing', () => {
    expect(() => {
      new PushFcmProvider({ id: '' })
    }).toThrow(ConfigurationError)

    try {
      new PushFcmProvider({ id: '' })
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError)
      expect((error as ConfigurationError).code).toBe('FCM_SERVER_KEY_MISSING')
      expect((error as ConfigurationError).message).toContain('requires an id (server key)')
    }
  })

  test('creates provider successfully with valid config', () => {
    const provider = new PushFcmProvider({ id: 'test-server-key' })
    expect(provider.id).toBe('push-fcm-provider')
  })

  test('creates provider with phonegap option', () => {
    const provider = new PushFcmProvider({ id: 'test-server-key', phonegap: true })
    expect(provider.id).toBe('push-fcm-provider')
  })
})

describe('FCM Push Provider - Send Method', () => {
  let mockSend: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockSend = vi.fn()
  })

  test('throws ProviderError when registrationToken is missing', async () => {
    const provider = new PushFcmProvider({ id: 'test-server-key' })

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
      expect((error as ProviderError).providerId).toBe('push-fcm-provider')
      expect((error as ProviderError).channel).toBe('push')
    }
  })

  test('sends notification successfully', async () => {
    const provider = new PushFcmProvider({ id: 'test-server-key' })

    // Mock successful response
    mockSend = vi.fn().mockResolvedValue([
      {
        success: 1,
        failure: 0,
        message: [{ messageId: 'fcm-message-id-123' }],
      },
    ])
    ;(provider as any).transporter = { send: mockSend }

    const messageId = await provider.send({
      registrationToken: 'device-token',
      title: 'Test Notification',
      body: 'Hello from FCM!',
      priority: 'high',
      badge: 5,
    })

    expect(mockSend).toHaveBeenCalledWith(['device-token'], {
      title: 'Test Notification',
      body: 'Hello from FCM!',
      priority: 'high',
      badge: 5,
    })
    expect(messageId).toBe('fcm-message-id-123')
  })

  test('sends notification with all parameters', async () => {
    const provider = new PushFcmProvider({ id: 'test-server-key' })

    mockSend = vi.fn().mockResolvedValue([
      {
        success: 1,
        failure: 0,
        message: [{ messageId: 'fcm-message-id-456' }],
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
      sound: 'notification.mp3',
      icon: 'ic_notification',
      color: '#FF0000',
      clickAction: 'FLUTTER_NOTIFICATION_CLICK',
    })

    expect(mockSend).toHaveBeenCalledWith(
      ['device-token'],
      expect.objectContaining({
        title: 'New Message',
        body: 'You have a new message',
        custom: { userId: '123', action: 'view' },
        priority: 'high',
        badge: 10,
        sound: 'notification.mp3',
        icon: 'ic_notification',
        color: '#FF0000',
        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
      })
    )
    expect(messageId).toBe('fcm-message-id-456')
  })

  test('applies customize function when provided', async () => {
    const provider = new PushFcmProvider({ id: 'test-server-key' })

    mockSend = vi.fn().mockResolvedValue([
      {
        success: 1,
        failure: 0,
        message: [{ messageId: 'fcm-custom-id' }],
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
    const provider = new PushFcmProvider({ id: 'test-server-key' })

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
    const provider = new PushFcmProvider({ id: 'test-server-key' })

    mockSend = vi.fn().mockResolvedValue([])
    ;(provider as any).transporter = { send: mockSend }

    await expect(
      provider.send({
        registrationToken: 'device-token',
        title: 'Test',
        body: 'Test',
      })
    ).rejects.toThrow('No response received from FCM')
  })

  test('throws ProviderError when result is empty', async () => {
    const provider = new PushFcmProvider({ id: 'test-server-key' })

    mockSend = vi.fn().mockResolvedValue([null])
    ;(provider as any).transporter = { send: mockSend }

    await expect(
      provider.send({
        registrationToken: 'device-token',
        title: 'Test',
        body: 'Test',
      })
    ).rejects.toThrow('Empty result received from FCM')
  })

  test('throws ProviderError when FCM returns failure', async () => {
    const provider = new PushFcmProvider({ id: 'test-server-key' })

    mockSend = vi.fn().mockResolvedValue([
      {
        success: 0,
        failure: 1,
        message: [{ error: 'InvalidRegistration' }],
      },
    ])
    ;(provider as any).transporter = { send: mockSend }

    await expect(
      provider.send({
        registrationToken: 'invalid-token',
        title: 'Test',
        body: 'Test',
      })
    ).rejects.toThrow('FCM notification failed: InvalidRegistration')

    try {
      await provider.send({
        registrationToken: 'invalid-token',
        title: 'Test',
        body: 'Test',
      })
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError)
      expect((error as ProviderError).code).toBe('FCM_SEND_FAILED')
      expect((error as ProviderError).channel).toBe('push')
    }
  })

  test('throws ProviderError when send throws an error', async () => {
    const provider = new PushFcmProvider({ id: 'test-server-key' })

    mockSend = vi.fn().mockRejectedValue(new Error('Network error'))
    ;(provider as any).transporter = { send: mockSend }

    await expect(
      provider.send({
        registrationToken: 'device-token',
        title: 'Test',
        body: 'Test',
      })
    ).rejects.toThrow('Failed to send FCM notification: Network error')

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
})
