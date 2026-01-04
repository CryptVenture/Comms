import { vi, test, expect, describe, beforeEach } from 'vitest'
import LoggerProvider from '../../src/providers/logger'
import logger from '../../src/util/logger'

// Mock the logger
vi.mock('../../src/util/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('LoggerProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Email channel', () => {
    test('redacts email PII before logging', async () => {
      const provider = new LoggerProvider({}, 'email')

      await provider.send({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Confidential Subject',
        text: 'Secret message content',
        html: '<p>Secret HTML content</p>',
      })

      // Verify logger.info was called with channel header
      expect(logger.info).toHaveBeenCalledWith('[EMAIL] Sent by "email-logger-provider":')

      // Verify logger.info was called with redacted data
      expect(logger.info).toHaveBeenCalledWith({
        from: 's***@example.com',
        to: 'r***@example.com',
        subject: '[REDACTED TEXT]',
        text: '[REDACTED TEXT]',
        html: '[REDACTED TEXT]',
      })
    })

    test('redacts email attachments', async () => {
      const provider = new LoggerProvider({}, 'email')

      await provider.send({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Test',
        attachments: [
          {
            contentType: 'application/pdf',
            filename: 'document.pdf',
            content: Buffer.from('sensitive file content'),
          },
        ],
      })

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: [
            {
              contentType: 'application/pdf',
              filename: 'document.pdf',
              content: '[REDACTED CONTENT]',
            },
          ],
        })
      )
    })

    test('preserves metadata fields', async () => {
      const provider = new LoggerProvider({}, 'email')

      await provider.send({
        id: 'notification-123',
        userId: 'user-456',
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Test',
      })

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'notification-123',
          userId: 'user-456',
        })
      )
    })
  })

  describe('SMS channel', () => {
    test('redacts SMS PII before logging', async () => {
      const provider = new LoggerProvider({}, 'sms')

      await provider.send({
        from: '+1234567890',
        to: '+0987654321',
        text: 'Your verification code is: 123456',
      })

      expect(logger.info).toHaveBeenCalledWith('[SMS] Sent by "sms-logger-provider":')

      expect(logger.info).toHaveBeenCalledWith({
        from: '+1***7890',
        to: '+0***4321',
        text: '[REDACTED TEXT]',
      })
    })

    test('preserves SMS metadata', async () => {
      const provider = new LoggerProvider({}, 'sms')

      await provider.send({
        from: '+1234567890',
        to: '+0987654321',
        text: 'Secret message',
        type: 'unicode',
        nature: 'transactional',
        ttl: 3600,
        messageClass: 1,
      })

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'unicode',
          nature: 'transactional',
          ttl: 3600,
          messageClass: 1,
        })
      )
    })
  })

  describe('Push notification channel', () => {
    test('redacts push notification PII before logging', async () => {
      const provider = new LoggerProvider({}, 'push')

      await provider.send({
        registrationToken: 'device-token-abc123xyz',
        title: 'New Message',
        body: 'You have a new message from John',
        badge: 5,
      })

      expect(logger.info).toHaveBeenCalledWith('[PUSH] Sent by "push-logger-provider":')

      expect(logger.info).toHaveBeenCalledWith({
        registrationToken: '[REDACTED TOKEN]',
        title: '[REDACTED TEXT]',
        body: '[REDACTED TEXT]',
        badge: 5,
      })
    })

    test('redacts custom data payload', async () => {
      const provider = new LoggerProvider({}, 'push')

      await provider.send({
        registrationToken: 'token-123',
        title: 'Alert',
        body: 'Alert message',
        custom: {
          userId: 'user-123',
          data: 'sensitive data',
        },
      })

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          custom: '[REDACTED OBJECT]',
        })
      )
    })
  })

  describe('Voice channel', () => {
    test('redacts voice call PII before logging', async () => {
      const provider = new LoggerProvider({}, 'voice')

      await provider.send({
        from: '+1234567890',
        to: '+0987654321',
        url: 'https://api.example.com/voice-script.xml?token=secret123',
      })

      expect(logger.info).toHaveBeenCalledWith('[VOICE] Sent by "voice-logger-provider":')

      expect(logger.info).toHaveBeenCalledWith({
        from: '+1***7890',
        to: '+0***4321',
        url: 'https://api.example.com/[REDACTED]',
      })
    })

    test('redacts callback URLs', async () => {
      const provider = new LoggerProvider({}, 'voice')

      await provider.send({
        from: '+1234567890',
        to: '+0987654321',
        url: 'https://api.example.com/script',
        fallbackUrl: 'https://fallback.example.com/script?key=abc',
        statusCallback: 'https://callback.example.com/status?apiKey=xyz',
      })

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          fallbackUrl: 'https://fallback.example.com/[REDACTED]',
          statusCallback: 'https://callback.example.com/[REDACTED]',
        })
      )
    })
  })

  describe('Webpush channel', () => {
    test('redacts webpush subscription and content before logging', async () => {
      const provider = new LoggerProvider({}, 'webpush')

      await provider.send({
        subscription: {
          endpoint: 'https://fcm.googleapis.com/fcm/send/token123',
          keys: {
            auth: 'base64-auth-secret',
            p256dh: 'base64-public-key',
          },
        },
        title: 'New Notification',
        body: 'You have a new notification',
      })

      expect(logger.info).toHaveBeenCalledWith('[WEBPUSH] Sent by "webpush-logger-provider":')

      expect(logger.info).toHaveBeenCalledWith({
        subscription: {
          endpoint: 'https://fcm.googleapis.com/[REDACTED]',
          keys: {
            auth: '[REDACTED KEY]',
            p256dh: '[REDACTED KEY]',
          },
        },
        title: '[REDACTED TEXT]',
        body: '[REDACTED TEXT]',
      })
    })
  })

  describe('Slack channel', () => {
    test('redacts Slack webhook and message content before logging', async () => {
      const provider = new LoggerProvider({}, 'slack')

      await provider.send({
        webhookUrl: 'https://hooks.slack.com/services/T00/B00/XXXX',
        text: 'Deployment completed successfully',
      })

      expect(logger.info).toHaveBeenCalledWith('[SLACK] Sent by "slack-logger-provider":')

      expect(logger.info).toHaveBeenCalledWith({
        webhookUrl: '[REDACTED WEBHOOK]',
        text: '[REDACTED TEXT]',
      })
    })

    test('redacts Slack attachment content', async () => {
      const provider = new LoggerProvider({}, 'slack')

      await provider.send({
        text: 'Alert',
        attachments: [
          {
            color: 'good',
            title: 'Deployment Status',
            text: 'Production deploy completed',
            author_name: 'John Doe',
          },
        ],
      })

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: [
            {
              color: 'good',
              title: '[REDACTED TEXT]',
              text: '[REDACTED TEXT]',
              author_name: '[REDACTED TEXT]',
            },
          ],
        })
      )
    })
  })

  describe('WhatsApp channel', () => {
    test('redacts WhatsApp PII before logging', async () => {
      const provider = new LoggerProvider({}, 'whatsapp')

      await provider.send({
        from: '1234567890',
        to: '0987654321',
        type: 'text',
        text: 'Hello from WhatsApp!',
      })

      expect(logger.info).toHaveBeenCalledWith('[WHATSAPP] Sent by "whatsapp-logger-provider":')

      expect(logger.info).toHaveBeenCalledWith({
        from: '***7890',
        to: '***4321',
        type: 'text',
        text: '[REDACTED TEXT]',
      })
    })

    test('redacts WhatsApp media URL and template data', async () => {
      const provider = new LoggerProvider({}, 'whatsapp')

      await provider.send({
        from: '1234567890',
        to: '0987654321',
        type: 'template',
        templateData: {
          name: 'John Doe',
          code: '123456',
        },
      })

      expect(logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          templateData: '[REDACTED OBJECT]',
        })
      )
    })
  })

  describe('Return value', () => {
    test('returns a random ID', async () => {
      const provider = new LoggerProvider({}, 'email')

      const id = await provider.send({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Test',
      })

      expect(id).toMatch(/^id-\d+$/)
    })

    test('returns different IDs for multiple sends', async () => {
      const provider = new LoggerProvider({}, 'email')

      const request = {
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Test',
      }

      const id1 = await provider.send(request)
      const id2 = await provider.send(request)

      // IDs should be different (with very high probability)
      expect(id1).not.toBe(id2)
    })
  })

  describe('Error handling', () => {
    test('wraps errors in ProviderError', async () => {
      const provider = new LoggerProvider({}, 'email')

      // Mock logger.info to throw an error
      vi.mocked(logger.info).mockImplementationOnce(() => {
        throw new Error('Logger failed')
      })

      await expect(
        provider.send({
          from: 'sender@example.com',
          to: 'recipient@example.com',
          subject: 'Test',
          text: 'Test',
        })
      ).rejects.toThrow('Logger provider failed: Logger failed')
    })
  })

  describe('Provider ID', () => {
    test('generates correct provider ID for email', () => {
      const provider = new LoggerProvider({}, 'email')
      expect(provider.id).toBe('email-logger-provider')
    })

    test('generates correct provider ID for sms', () => {
      const provider = new LoggerProvider({}, 'sms')
      expect(provider.id).toBe('sms-logger-provider')
    })

    test('generates correct provider ID for push', () => {
      const provider = new LoggerProvider({}, 'push')
      expect(provider.id).toBe('push-logger-provider')
    })

    test('generates correct provider ID for voice', () => {
      const provider = new LoggerProvider({}, 'voice')
      expect(provider.id).toBe('voice-logger-provider')
    })

    test('generates correct provider ID for webpush', () => {
      const provider = new LoggerProvider({}, 'webpush')
      expect(provider.id).toBe('webpush-logger-provider')
    })

    test('generates correct provider ID for slack', () => {
      const provider = new LoggerProvider({}, 'slack')
      expect(provider.id).toBe('slack-logger-provider')
    })

    test('generates correct provider ID for whatsapp', () => {
      const provider = new LoggerProvider({}, 'whatsapp')
      expect(provider.id).toBe('whatsapp-logger-provider')
    })
  })
})
