import { describe, test, expect } from 'vitest'
import { redactPii } from '../../src/util/redact-pii'

describe('redactPii', () => {
  describe('Email redaction', () => {
    test('redacts email addresses preserving domain', () => {
      const result = redactPii({
        email: {
          from: 'sender@example.com',
          to: 'recipient@example.com',
        },
      })

      expect(result).toEqual({
        email: {
          from: 's***@example.com',
          to: 'r***@example.com',
        },
      })
    })

    test('redacts email arrays (cc, bcc)', () => {
      const result = redactPii({
        email: {
          cc: ['user1@example.com', 'user2@test.org'],
          bcc: ['admin@company.com'],
        },
      })

      expect(result).toEqual({
        email: {
          cc: ['u***@example.com', 'u***@test.org'],
          bcc: ['a***@company.com'],
        },
      })
    })

    test('redacts email subject and content', () => {
      const result = redactPii({
        email: {
          subject: 'Confidential Information',
          text: 'This is secret text',
          html: '<p>This is secret HTML</p>',
        },
      })

      expect(result).toEqual({
        email: {
          subject: '[REDACTED TEXT]',
          text: '[REDACTED TEXT]',
          html: '[REDACTED TEXT]',
        },
      })
    })

    test('redacts email attachments content while preserving metadata', () => {
      const result = redactPii({
        email: {
          attachments: [
            {
              contentType: 'application/pdf',
              filename: 'document.pdf',
              content: Buffer.from('sensitive file content'),
            },
            {
              contentType: 'image/png',
              filename: 'screenshot.png',
              content: 'base64-encoded-image-data',
            },
          ],
        },
      })

      expect(result).toEqual({
        email: {
          attachments: [
            {
              contentType: 'application/pdf',
              filename: 'document.pdf',
              content: '[REDACTED CONTENT]',
            },
            {
              contentType: 'image/png',
              filename: 'screenshot.png',
              content: '[REDACTED CONTENT]',
            },
          ],
        },
      })
    })
  })

  describe('SMS redaction', () => {
    test('redacts phone numbers preserving last 4 digits', () => {
      const result = redactPii({
        sms: {
          from: '+1234567890',
          to: '+0987654321',
        },
      })

      expect(result).toEqual({
        sms: {
          from: '+1***7890',
          to: '+0***4321',
        },
      })
    })

    test('redacts phone numbers without country code', () => {
      const result = redactPii({
        sms: {
          from: '1234567890',
          to: '0987654321',
        },
      })

      expect(result).toEqual({
        sms: {
          from: '***7890',
          to: '***4321',
        },
      })
    })

    test('redacts SMS text content', () => {
      const result = redactPii({
        sms: {
          text: 'Your verification code is: 123456',
        },
      })

      expect(result).toEqual({
        sms: {
          text: '[REDACTED TEXT]',
        },
      })
    })

    test('preserves SMS metadata', () => {
      const result = redactPii({
        sms: {
          from: '+1234567890',
          to: '+0987654321',
          text: 'Secret message',
          type: 'unicode',
          nature: 'transactional',
          ttl: 3600,
          messageClass: 1,
        },
      })

      expect(result).toEqual({
        sms: {
          from: '+1***7890',
          to: '+0***4321',
          text: '[REDACTED TEXT]',
          type: 'unicode',
          nature: 'transactional',
          ttl: 3600,
          messageClass: 1,
        },
      })
    })
  })

  describe('Push notification redaction', () => {
    test('redacts push notification tokens and content', () => {
      const result = redactPii({
        push: {
          registrationToken: 'device-token-abc123xyz',
          title: 'New Message',
          body: 'You have a new message from John',
        },
      })

      expect(result).toEqual({
        push: {
          registrationToken: '[REDACTED TOKEN]',
          title: '[REDACTED TEXT]',
          body: '[REDACTED TEXT]',
        },
      })
    })

    test('redacts custom data payload', () => {
      const result = redactPii({
        push: {
          registrationToken: 'token-123',
          title: 'Alert',
          body: 'Alert message',
          custom: {
            userId: 'user-123',
            data: 'sensitive data',
          },
        },
      })

      expect(result).toEqual({
        push: {
          registrationToken: '[REDACTED TOKEN]',
          title: '[REDACTED TEXT]',
          body: '[REDACTED TEXT]',
          custom: '[REDACTED OBJECT]',
        },
      })
    })

    test('preserves push notification priority and metadata', () => {
      const result = redactPii({
        push: {
          registrationToken: 'token-123',
          title: 'Alert',
          body: 'Message',
          priority: 'high',
          badge: 5,
        },
      })

      expect(result).toEqual({
        push: {
          registrationToken: '[REDACTED TOKEN]',
          title: '[REDACTED TEXT]',
          body: '[REDACTED TEXT]',
          priority: 'high',
          badge: 5,
        },
      })
    })
  })

  describe('Voice call redaction', () => {
    test('redacts phone numbers and URLs', () => {
      const result = redactPii({
        voice: {
          from: '+1234567890',
          to: '+0987654321',
          url: 'https://api.example.com/voice-script.xml?token=secret123',
        },
      })

      expect(result).toEqual({
        voice: {
          from: '+1***7890',
          to: '+0***4321',
          url: 'https://api.example.com/[REDACTED]',
        },
      })
    })

    test('redacts fallback and callback URLs', () => {
      const result = redactPii({
        voice: {
          from: '+1234567890',
          to: '+0987654321',
          url: 'https://primary.example.com/script',
          fallbackUrl: 'https://fallback.example.com/script?key=abc',
          statusCallback: 'https://callback.example.com/status?apiKey=xyz',
        },
      })

      expect(result).toEqual({
        voice: {
          from: '+1***7890',
          to: '+0***4321',
          url: 'https://primary.example.com/[REDACTED]',
          fallbackUrl: 'https://fallback.example.com/[REDACTED]',
          statusCallback: 'https://callback.example.com/[REDACTED]',
        },
      })
    })

    test('preserves voice call method and timeout', () => {
      const result = redactPii({
        voice: {
          from: '+1234567890',
          to: '+0987654321',
          url: 'https://api.example.com/script',
          method: 'POST',
          timeout: 30,
        },
      })

      expect(result).toEqual({
        voice: {
          from: '+1***7890',
          to: '+0***4321',
          url: 'https://api.example.com/[REDACTED]',
          method: 'POST',
          timeout: 30,
        },
      })
    })
  })

  describe('Webpush redaction', () => {
    test('redacts webpush subscription keys and content', () => {
      const result = redactPii({
        webpush: {
          subscription: {
            endpoint: 'https://fcm.googleapis.com/fcm/send/token123',
            keys: {
              auth: 'base64-auth-secret',
              p256dh: 'base64-public-key',
            },
          },
          title: 'New Notification',
          body: 'You have a new notification',
        },
      })

      expect(result).toEqual({
        webpush: {
          subscription: {
            endpoint: 'https://fcm.googleapis.com/[REDACTED]',
            keys: {
              auth: '[REDACTED KEY]',
              p256dh: '[REDACTED KEY]',
            },
          },
          title: '[REDACTED TEXT]',
          body: '[REDACTED TEXT]',
        },
      })
    })

    test('preserves webpush metadata and direction', () => {
      const result = redactPii({
        webpush: {
          subscription: {
            endpoint: 'https://push.example.com/token',
            keys: { auth: 'secret', p256dh: 'key' },
          },
          title: 'Alert',
          body: 'Message',
          dir: 'ltr',
          requireInteraction: true,
        },
      })

      expect(result).toEqual({
        webpush: {
          subscription: {
            endpoint: 'https://push.example.com/[REDACTED]',
            keys: {
              auth: '[REDACTED KEY]',
              p256dh: '[REDACTED KEY]',
            },
          },
          title: '[REDACTED TEXT]',
          body: '[REDACTED TEXT]',
          dir: 'ltr',
          requireInteraction: true,
        },
      })
    })
  })

  describe('Slack redaction', () => {
    test('redacts webhook URL and message text', () => {
      const result = redactPii({
        slack: {
          webhookUrl: 'https://hooks.slack.com/services/T00/B00/XXXX',
          text: 'Deployment completed successfully',
        },
      })

      expect(result).toEqual({
        slack: {
          webhookUrl: '[REDACTED WEBHOOK]',
          text: '[REDACTED TEXT]',
        },
      })
    })

    test('redacts Slack attachment content', () => {
      const result = redactPii({
        slack: {
          text: 'Alert',
          attachments: [
            {
              color: 'good',
              title: 'Deployment Status',
              text: 'Production deploy completed',
              pretext: 'New deployment',
              author_name: 'John Doe',
              fields: [
                { title: 'Environment', value: 'Production', short: true },
                { title: 'Version', value: '2.0.1', short: true },
              ],
            },
          ],
        },
      })

      expect(result).toEqual({
        slack: {
          text: '[REDACTED TEXT]',
          attachments: [
            {
              color: 'good',
              title: '[REDACTED TEXT]',
              text: '[REDACTED TEXT]',
              pretext: '[REDACTED TEXT]',
              author_name: '[REDACTED TEXT]',
              fields: [
                { title: '[REDACTED TEXT]', value: '[REDACTED TEXT]', short: true },
                { title: '[REDACTED TEXT]', value: '[REDACTED TEXT]', short: true },
              ],
            },
          ],
        },
      })
    })
  })

  describe('WhatsApp redaction', () => {
    test('redacts phone numbers and text content', () => {
      const result = redactPii({
        whatsapp: {
          from: '1234567890',
          to: '0987654321',
          type: 'text',
          text: 'Hello from WhatsApp!',
        },
      })

      expect(result).toEqual({
        whatsapp: {
          from: '***7890',
          to: '***4321',
          type: 'text',
          text: '[REDACTED TEXT]',
        },
      })
    })

    test('redacts media URLs and template data', () => {
      const result = redactPii({
        whatsapp: {
          from: '1234567890',
          to: '0987654321',
          type: 'image',
          mediaUrl: 'https://cdn.example.com/images/photo.jpg?token=secret',
          templateData: {
            name: 'John Doe',
            code: '123456',
          },
        },
      })

      expect(result).toEqual({
        whatsapp: {
          from: '***7890',
          to: '***4321',
          type: 'image',
          mediaUrl: 'https://cdn.example.com/[REDACTED]',
          templateData: '[REDACTED OBJECT]',
        },
      })
    })
  })

  describe('Metadata preservation', () => {
    test('preserves id and userId fields', () => {
      const result = redactPii({
        email: {
          id: 'notification-123',
          userId: 'user-456',
          from: 'sender@example.com',
          to: 'recipient@example.com',
          subject: 'Test',
          text: 'Message',
        },
      })

      expect(result).toEqual({
        email: {
          id: 'notification-123',
          userId: 'user-456',
          from: 's***@example.com',
          to: 'r***@example.com',
          subject: '[REDACTED TEXT]',
          text: '[REDACTED TEXT]',
        },
      })
    })
  })

  describe('Edge cases', () => {
    test('handles null and undefined values', () => {
      const result = redactPii({
        email: {
          from: 'sender@example.com',
          to: null,
          subject: undefined,
        },
      })

      expect(result).toEqual({
        email: {
          from: 's***@example.com',
          to: null,
          subject: undefined,
        },
      })
    })

    test('handles empty objects', () => {
      const result = redactPii({})
      expect(result).toEqual({})
    })

    test('handles nested objects', () => {
      const result = redactPii({
        email: {
          from: 'sender@example.com',
          to: 'recipient@example.com',
          nested: {
            level1: {
              level2: {
                text: 'Deep secret',
              },
            },
          },
        },
      })

      expect(result).toEqual({
        email: {
          from: 's***@example.com',
          to: 'r***@example.com',
          nested: {
            level1: {
              level2: {
                text: '[REDACTED TEXT]',
              },
            },
          },
        },
      })
    })

    test('handles arrays of primitives', () => {
      const result = redactPii({
        data: [1, 2, 3, 'test', true],
      })

      expect(result).toEqual({
        data: [1, 2, 3, 'test', true],
      })
    })

    test('prevents infinite recursion with depth limit', () => {
      const circular: Record<string, unknown> = { level: 0 }
      let current = circular
      for (let i = 1; i <= 15; i++) {
        current.next = { level: i }
        current = current.next as Record<string, unknown>
      }

      const result = redactPii(circular)
      expect(result).toBeDefined()
    })

    test('handles Buffer objects', () => {
      const result = redactPii({
        content: Buffer.from('sensitive data'),
      })

      expect(result).toEqual({
        content: '[REDACTED CONTENT]',
      })
    })

    test('handles Date objects', () => {
      const date = new Date('2024-01-01T00:00:00Z')
      const result = redactPii({
        timestamp: date,
      })

      expect(result).toEqual({
        timestamp: date,
      })
    })

    test('handles invalid email addresses', () => {
      const result = redactPii({
        from: 'not-an-email',
        to: '@invalid',
      })

      expect(result).toEqual({
        from: '[REDACTED EMAIL]',
        to: '[REDACTED EMAIL]',
      })
    })

    test('handles invalid phone numbers', () => {
      // At root level, 'from'/'to' are ambiguous. When values don't match phone/email patterns,
      // they fall back to email redaction. This test verifies the fallback behavior.
      const result = redactPii({
        from: '12',
        to: 'abc',
      })

      expect(result).toEqual({
        from: '[REDACTED EMAIL]',
        to: '[REDACTED EMAIL]',
      })
    })

    test('handles invalid URLs', () => {
      const result = redactPii({
        voice: {
          url: 'not-a-url',
        },
      })

      expect(result).toEqual({
        voice: {
          url: '[REDACTED URL]',
        },
      })
    })
  })

  describe('Multi-channel requests', () => {
    test('redacts complex multi-channel notification request', () => {
      const result = redactPii({
        id: 'notification-123',
        userId: 'user-456',
        email: {
          from: 'sender@example.com',
          to: 'recipient@example.com',
          subject: 'Welcome!',
          text: 'Welcome to our service',
        },
        sms: {
          from: '+1234567890',
          to: '+0987654321',
          text: 'Your verification code is: 123456',
        },
        push: {
          registrationToken: 'device-token-xyz',
          title: 'New Message',
          body: 'You have a new message',
        },
      })

      expect(result).toEqual({
        id: 'notification-123',
        userId: 'user-456',
        email: {
          from: 's***@example.com',
          to: 'r***@example.com',
          subject: '[REDACTED TEXT]',
          text: '[REDACTED TEXT]',
        },
        sms: {
          from: '+1***7890',
          to: '+0***4321',
          text: '[REDACTED TEXT]',
        },
        push: {
          registrationToken: '[REDACTED TOKEN]',
          title: '[REDACTED TEXT]',
          body: '[REDACTED TEXT]',
        },
      })
    })
  })
})
