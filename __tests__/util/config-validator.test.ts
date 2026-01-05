import { describe, test, expect } from 'vitest'
import ConfigValidator, {
  createConfigValidator,
  PROVIDER_REQUIREMENTS,
  type ValidationIssue,
} from '../../src/util/config-validator'
import { ConfigurationError } from '../../src/types/errors'

describe('ConfigValidator', () => {
  describe('constructor and factory', () => {
    test('creates instance via constructor', () => {
      const validator = new ConfigValidator()
      expect(validator).toBeInstanceOf(ConfigValidator)
    })

    test('creates instance via factory function', () => {
      const validator = createConfigValidator()
      expect(validator).toBeInstanceOf(ConfigValidator)
    })
  })

  describe('validate() method', () => {
    test('returns valid for empty config', () => {
      const validator = new ConfigValidator()
      const result = validator.validate({})
      expect(result).toEqual({ valid: true, issues: [] })
    })

    test('returns valid for config without channels', () => {
      const validator = new ConfigValidator()
      const result = validator.validate({ useNotificationCatcher: true } as any)
      expect(result).toEqual({ valid: true, issues: [] })
    })

    test('returns valid for properly configured channels', () => {
      const validator = new ConfigValidator()
      const result = validator.validate({
        channels: {
          email: {
            providers: [{ type: 'sendgrid', apiKey: 'sg-key' }],
          },
          sms: {
            providers: [{ type: 'twilio', accountSid: 'sid', authToken: 'token' }],
          },
        },
      })
      expect(result.valid).toBe(true)
      expect(result.issues).toHaveLength(0)
    })

    test('detects missing fields across multiple channels', () => {
      const validator = new ConfigValidator()
      const result = validator.validate({
        channels: {
          email: {
            providers: [{ type: 'sendgrid' }], // Missing apiKey
          },
          sms: {
            providers: [{ type: 'twilio' }], // Missing accountSid and authToken
          },
        },
      })
      expect(result.valid).toBe(false)
      expect(result.issues).toHaveLength(2)
      expect(result.issues.map((i) => i.channel)).toContain('email')
      expect(result.issues.map((i) => i.channel)).toContain('sms')
    })

    test('validates multiple providers per channel', () => {
      const validator = new ConfigValidator()
      const result = validator.validate({
        channels: {
          email: {
            providers: [
              { type: 'sendgrid' }, // Missing apiKey
              { type: 'mailgun' }, // Missing apiKey and domainName
              { type: 'mandrill', apiKey: 'key' }, // Valid
            ],
          },
        },
      })
      expect(result.valid).toBe(false)
      expect(result.issues).toHaveLength(2)
    })

    test('skips null channel config', () => {
      const validator = new ConfigValidator()
      const result = validator.validate({
        channels: {
          email: null,
        },
      } as any)
      expect(result.valid).toBe(true)
    })
  })

  describe('validateChannel() method', () => {
    test('returns empty array for null providers', () => {
      const validator = new ConfigValidator()
      const result = validator.validateChannel('email', { providers: null } as any)
      expect(result).toHaveLength(0)
    })

    test('returns empty array for non-array providers', () => {
      const validator = new ConfigValidator()
      const result = validator.validateChannel('email', { providers: {} } as any)
      expect(result).toHaveLength(0)
    })

    test('validates all providers in channel', () => {
      const validator = new ConfigValidator()
      const result = validator.validateChannel('email', {
        providers: [{ type: 'sendgrid' }, { type: 'mailgun' }],
      })
      expect(result).toHaveLength(2)
    })
  })

  describe('validateProvider() method', () => {
    test('reports error for missing type field', () => {
      const validator = new ConfigValidator()
      const result = validator.validateProvider('email', {} as any)
      expect(result).toHaveLength(1)
      expect(result[0]?.channel).toBe('email')
      expect(result[0]?.providerType).toBe('unknown')
      expect(result[0]?.missingFields).toContain('type')
    })

    test('skips validation for logger provider', () => {
      const validator = new ConfigValidator()
      const result = validator.validateProvider('email', { type: 'logger' })
      expect(result).toHaveLength(0)
    })

    test('skips validation for notificationcatcher provider', () => {
      const validator = new ConfigValidator()
      const result = validator.validateProvider('sms', { type: 'notificationcatcher' })
      expect(result).toHaveLength(0)
    })

    test('skips validation for custom provider', () => {
      const validator = new ConfigValidator()
      const result = validator.validateProvider('push', { type: 'custom', send: () => {} })
      expect(result).toHaveLength(0)
    })

    test('skips validation for unknown channel', () => {
      const validator = new ConfigValidator()
      const result = validator.validateProvider('unknown' as any, { type: 'sendgrid' })
      expect(result).toHaveLength(0)
    })

    test('skips validation for unknown provider type', () => {
      const validator = new ConfigValidator()
      const result = validator.validateProvider('email', { type: 'unknown-provider' })
      expect(result).toHaveLength(0)
    })
  })

  describe('Email provider validation', () => {
    const validator = new ConfigValidator()

    test('SendGrid requires apiKey', () => {
      const result = validator.validateProvider('email', { type: 'sendgrid' })
      expect(result).toHaveLength(1)
      expect(result[0]?.missingFields).toContain('apiKey')

      const valid = validator.validateProvider('email', { type: 'sendgrid', apiKey: 'key' })
      expect(valid).toHaveLength(0)
    })

    test('Mailgun requires apiKey and domainName', () => {
      const result = validator.validateProvider('email', { type: 'mailgun' })
      expect(result).toHaveLength(1)
      expect(result[0]?.missingFields).toContain('apiKey')
      expect(result[0]?.missingFields).toContain('domainName')

      const partial = validator.validateProvider('email', { type: 'mailgun', apiKey: 'key' })
      expect(partial).toHaveLength(1)
      expect(partial[0]?.missingFields).toContain('domainName')

      const valid = validator.validateProvider('email', {
        type: 'mailgun',
        apiKey: 'key',
        domainName: 'domain.com',
      })
      expect(valid).toHaveLength(0)
    })

    test('Mandrill requires apiKey', () => {
      const result = validator.validateProvider('email', { type: 'mandrill' })
      expect(result).toHaveLength(1)
      expect(result[0]?.missingFields).toContain('apiKey')

      const valid = validator.validateProvider('email', { type: 'mandrill', apiKey: 'key' })
      expect(valid).toHaveLength(0)
    })

    test('Postmark requires serverToken', () => {
      const result = validator.validateProvider('email', { type: 'postmark' })
      expect(result).toHaveLength(1)
      expect(result[0]?.missingFields).toContain('serverToken')

      const valid = validator.validateProvider('email', { type: 'postmark', serverToken: 'token' })
      expect(valid).toHaveLength(0)
    })

    test('SparkPost requires apiKey', () => {
      const result = validator.validateProvider('email', { type: 'sparkpost' })
      expect(result).toHaveLength(1)
      expect(result[0]?.missingFields).toContain('apiKey')

      const valid = validator.validateProvider('email', { type: 'sparkpost', apiKey: 'key' })
      expect(valid).toHaveLength(0)
    })

    test('SES requires region', () => {
      const result = validator.validateProvider('email', { type: 'ses' })
      expect(result).toHaveLength(1)
      expect(result[0]?.missingFields).toContain('region')

      const valid = validator.validateProvider('email', { type: 'ses', region: 'us-east-1' })
      expect(valid).toHaveLength(0)
    })

    test('SMTP has optional configuration', () => {
      const result = validator.validateProvider('email', { type: 'smtp' })
      expect(result).toHaveLength(0)
    })

    test('Sendmail has optional configuration', () => {
      const result = validator.validateProvider('email', { type: 'sendmail' })
      expect(result).toHaveLength(0)
    })
  })

  describe('SMS provider validation', () => {
    const validator = new ConfigValidator()

    test('Twilio requires accountSid and authToken', () => {
      const result = validator.validateProvider('sms', { type: 'twilio' })
      expect(result).toHaveLength(1)
      expect(result[0]?.missingFields).toContain('accountSid')
      expect(result[0]?.missingFields).toContain('authToken')

      const valid = validator.validateProvider('sms', {
        type: 'twilio',
        accountSid: 'sid',
        authToken: 'token',
      })
      expect(valid).toHaveLength(0)
    })

    test('Nexmo requires apiKey and apiSecret', () => {
      const result = validator.validateProvider('sms', { type: 'nexmo' })
      expect(result).toHaveLength(1)
      expect(result[0]?.missingFields).toContain('apiKey')
      expect(result[0]?.missingFields).toContain('apiSecret')

      const valid = validator.validateProvider('sms', {
        type: 'nexmo',
        apiKey: 'key',
        apiSecret: 'secret',
      })
      expect(valid).toHaveLength(0)
    })

    test('Plivo requires authId and authToken', () => {
      const result = validator.validateProvider('sms', { type: 'plivo' })
      expect(result).toHaveLength(1)
      expect(result[0]?.missingFields).toContain('authId')
      expect(result[0]?.missingFields).toContain('authToken')

      const valid = validator.validateProvider('sms', {
        type: 'plivo',
        authId: 'id',
        authToken: 'token',
      })
      expect(valid).toHaveLength(0)
    })

    test('Infobip requires username and password', () => {
      const result = validator.validateProvider('sms', { type: 'infobip' })
      expect(result).toHaveLength(1)
      expect(result[0]?.missingFields).toContain('username')
      expect(result[0]?.missingFields).toContain('password')

      const valid = validator.validateProvider('sms', {
        type: 'infobip',
        username: 'user',
        password: 'pass',
      })
      expect(valid).toHaveLength(0)
    })

    test('Clickatell requires apiKey', () => {
      const result = validator.validateProvider('sms', { type: 'clickatell' })
      expect(result).toHaveLength(1)
      expect(result[0]?.missingFields).toContain('apiKey')

      const valid = validator.validateProvider('sms', { type: 'clickatell', apiKey: 'key' })
      expect(valid).toHaveLength(0)
    })

    test('Callr requires login and password', () => {
      const result = validator.validateProvider('sms', { type: 'callr' })
      expect(result).toHaveLength(1)
      expect(result[0]?.missingFields).toContain('login')
      expect(result[0]?.missingFields).toContain('password')

      const valid = validator.validateProvider('sms', {
        type: 'callr',
        login: 'user',
        password: 'pass',
      })
      expect(valid).toHaveLength(0)
    })

    test('OVH requires appKey, appSecret, consumerKey, account, and host', () => {
      const result = validator.validateProvider('sms', { type: 'ovh' })
      expect(result).toHaveLength(1)
      expect(result[0]?.missingFields).toContain('appKey')
      expect(result[0]?.missingFields).toContain('appSecret')
      expect(result[0]?.missingFields).toContain('consumerKey')
      expect(result[0]?.missingFields).toContain('account')
      expect(result[0]?.missingFields).toContain('host')

      const valid = validator.validateProvider('sms', {
        type: 'ovh',
        appKey: 'key',
        appSecret: 'secret',
        consumerKey: 'consumer',
        account: 'account',
        host: 'ovh-eu',
      })
      expect(valid).toHaveLength(0)
    })

    test('Seven requires apiKey', () => {
      const result = validator.validateProvider('sms', { type: 'seven' })
      expect(result).toHaveLength(1)
      expect(result[0]?.missingFields).toContain('apiKey')

      const valid = validator.validateProvider('sms', { type: 'seven', apiKey: 'key' })
      expect(valid).toHaveLength(0)
    })

    test('46elks requires apiUsername and apiPassword', () => {
      const result = validator.validateProvider('sms', { type: '46elks' })
      expect(result).toHaveLength(1)
      expect(result[0]?.missingFields).toContain('apiUsername')
      expect(result[0]?.missingFields).toContain('apiPassword')

      const valid = validator.validateProvider('sms', {
        type: '46elks',
        apiUsername: 'user',
        apiPassword: 'pass',
      })
      expect(valid).toHaveLength(0)
    })
  })

  describe('Push provider validation', () => {
    const validator = new ConfigValidator()

    test('FCM requires id', () => {
      const result = validator.validateProvider('push', { type: 'fcm' })
      expect(result).toHaveLength(1)
      expect(result[0]?.missingFields).toContain('id')

      const valid = validator.validateProvider('push', { type: 'fcm', id: 'server-key' })
      expect(valid).toHaveLength(0)
    })

    test('APN requires token auth OR certificate auth OR pfx', () => {
      // No auth at all
      const result = validator.validateProvider('push', { type: 'apn' })
      expect(result).toHaveLength(1)
      expect(result[0]?.message).toContain('token authentication')

      // Token auth complete
      const tokenAuth = validator.validateProvider('push', {
        type: 'apn',
        token: { key: 'key', keyId: 'keyid', teamId: 'team' },
      })
      expect(tokenAuth).toHaveLength(0)

      // Certificate auth complete
      const certAuth = validator.validateProvider('push', {
        type: 'apn',
        cert: 'cert-data',
        key: 'key-data',
      })
      expect(certAuth).toHaveLength(0)

      // PFX auth complete
      const pfxAuth = validator.validateProvider('push', {
        type: 'apn',
        pfx: 'pfx-data',
      })
      expect(pfxAuth).toHaveLength(0)
    })

    test('APN partial token auth reports missing fields', () => {
      const result = validator.validateProvider('push', {
        type: 'apn',
        token: { key: 'key' },
      })
      expect(result).toHaveLength(1)
      expect(result[0]?.missingFields).toContain('token.keyId')
      expect(result[0]?.missingFields).toContain('token.teamId')
    })

    test('ADM requires clientId and clientSecret', () => {
      const result = validator.validateProvider('push', { type: 'adm' })
      expect(result).toHaveLength(1)
      expect(result[0]?.missingFields).toContain('clientId')
      expect(result[0]?.missingFields).toContain('clientSecret')

      const valid = validator.validateProvider('push', {
        type: 'adm',
        clientId: 'id',
        clientSecret: 'secret',
      })
      expect(valid).toHaveLength(0)
    })

    test('WNS requires clientId, clientSecret, and notificationMethod', () => {
      const result = validator.validateProvider('push', { type: 'wns' })
      expect(result).toHaveLength(1)
      expect(result[0]?.missingFields).toContain('clientId')
      expect(result[0]?.missingFields).toContain('clientSecret')
      expect(result[0]?.missingFields).toContain('notificationMethod')

      const valid = validator.validateProvider('push', {
        type: 'wns',
        clientId: 'id',
        clientSecret: 'secret',
        notificationMethod: 'toast',
      })
      expect(valid).toHaveLength(0)
    })
  })

  describe('Voice provider validation', () => {
    const validator = new ConfigValidator()

    test('Twilio Voice requires accountSid and authToken', () => {
      const result = validator.validateProvider('voice', { type: 'twilio' })
      expect(result).toHaveLength(1)
      expect(result[0]?.missingFields).toContain('accountSid')
      expect(result[0]?.missingFields).toContain('authToken')

      const valid = validator.validateProvider('voice', {
        type: 'twilio',
        accountSid: 'sid',
        authToken: 'token',
      })
      expect(valid).toHaveLength(0)
    })
  })

  describe('Webpush provider validation', () => {
    const validator = new ConfigValidator()

    test('GCM requires gcmAPIKey OR vapidDetails', () => {
      // No auth at all
      const result = validator.validateProvider('webpush', { type: 'gcm' })
      expect(result).toHaveLength(1)
      expect(result[0]?.message).toContain('gcmAPIKey or vapidDetails')

      // GCM API key
      const gcmAuth = validator.validateProvider('webpush', {
        type: 'gcm',
        gcmAPIKey: 'api-key',
      })
      expect(gcmAuth).toHaveLength(0)

      // VAPID details complete
      const vapidAuth = validator.validateProvider('webpush', {
        type: 'gcm',
        vapidDetails: {
          subject: 'mailto:test@example.com',
          publicKey: 'public-key',
          privateKey: 'private-key',
        },
      })
      expect(vapidAuth).toHaveLength(0)
    })

    test('GCM partial vapidDetails reports missing fields', () => {
      const result = validator.validateProvider('webpush', {
        type: 'gcm',
        vapidDetails: { subject: 'mailto:test@example.com' },
      })
      expect(result).toHaveLength(1)
      expect(result[0]?.missingFields).toContain('vapidDetails.publicKey')
      expect(result[0]?.missingFields).toContain('vapidDetails.privateKey')
    })
  })

  describe('Slack provider validation', () => {
    const validator = new ConfigValidator()

    test('Slack requires webhookUrl', () => {
      const result = validator.validateProvider('slack', { type: 'slack' })
      expect(result).toHaveLength(1)
      expect(result[0]?.missingFields).toContain('webhookUrl')

      const valid = validator.validateProvider('slack', {
        type: 'slack',
        webhookUrl: 'https://hooks.slack.com/services/T00/B00/XXX',
      })
      expect(valid).toHaveLength(0)
    })
  })

  describe('WhatsApp provider validation', () => {
    const validator = new ConfigValidator()

    test('Infobip WhatsApp requires baseUrl and apiKey', () => {
      const result = validator.validateProvider('whatsapp', { type: 'infobip' })
      expect(result).toHaveLength(1)
      expect(result[0]?.missingFields).toContain('baseUrl')
      expect(result[0]?.missingFields).toContain('apiKey')

      const valid = validator.validateProvider('whatsapp', {
        type: 'infobip',
        baseUrl: 'https://api.infobip.com',
        apiKey: 'key',
      })
      expect(valid).toHaveLength(0)
    })
  })

  describe('validateOrThrow() method', () => {
    test('does not throw for valid config', () => {
      const validator = new ConfigValidator()
      expect(() => {
        validator.validateOrThrow({
          channels: {
            email: {
              providers: [{ type: 'sendgrid', apiKey: 'key' }],
            },
          },
        })
      }).not.toThrow()
    })

    test('throws ConfigurationError for invalid config', () => {
      const validator = new ConfigValidator()
      expect(() => {
        validator.validateOrThrow({
          channels: {
            email: {
              providers: [{ type: 'sendgrid' }],
            },
          },
        })
      }).toThrow(ConfigurationError)
    })

    test('ConfigurationError has correct error code', () => {
      const validator = new ConfigValidator()
      try {
        validator.validateOrThrow({
          channels: {
            email: {
              providers: [{ type: 'sendgrid' }],
            },
          },
        })
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError)
        expect((error as ConfigurationError).code).toBe('INVALID_CONFIG')
      }
    })

    test('ConfigurationError includes issues array', () => {
      const validator = new ConfigValidator()
      try {
        validator.validateOrThrow({
          channels: {
            email: {
              providers: [{ type: 'sendgrid' }],
            },
          },
        })
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError)
        const configError = error as ConfigurationError
        expect(configError.issues).toBeDefined()
        expect(configError.issues).toHaveLength(1)
        expect(configError.issues?.[0]?.channel).toBe('email')
        expect(configError.issues?.[0]?.providerType).toBe('sendgrid')
      }
    })
  })

  describe('formatErrorMessage() method', () => {
    test('returns valid message for empty issues', () => {
      const validator = new ConfigValidator()
      const message = validator.formatErrorMessage([])
      expect(message).toBe('Configuration is valid')
    })

    test('formats single issue correctly', () => {
      const validator = new ConfigValidator()
      const issue: ValidationIssue = {
        channel: 'email',
        providerType: 'sendgrid',
        missingFields: ['apiKey'],
        message: 'email/sendgrid: SendGrid requires apiKey. Missing: apiKey',
      }
      const message = validator.formatErrorMessage([issue])
      expect(message).toContain('Invalid configuration:')
      expect(message).toContain('sendgrid')
      expect(message).toContain('apiKey')
    })

    test('formats multiple issues correctly', () => {
      const validator = new ConfigValidator()
      const issues: ValidationIssue[] = [
        {
          channel: 'email',
          providerType: 'sendgrid',
          missingFields: ['apiKey'],
          message: 'email/sendgrid: Missing apiKey',
        },
        {
          channel: 'sms',
          providerType: 'twilio',
          missingFields: ['accountSid', 'authToken'],
          message: 'sms/twilio: Missing accountSid, authToken',
        },
      ]
      const message = validator.formatErrorMessage(issues)
      expect(message).toContain('2 issues')
      expect(message).toContain('1.')
      expect(message).toContain('2.')
    })
  })

  describe('Edge cases', () => {
    test('handles empty string values as missing', () => {
      const validator = new ConfigValidator()
      const result = validator.validateProvider('email', {
        type: 'sendgrid',
        apiKey: '',
      })
      expect(result).toHaveLength(1)
      expect(result[0]?.missingFields).toContain('apiKey')
    })

    test('handles null values as missing', () => {
      const validator = new ConfigValidator()
      const result = validator.validateProvider('email', {
        type: 'sendgrid',
        apiKey: null,
      } as any)
      expect(result).toHaveLength(1)
      expect(result[0]?.missingFields).toContain('apiKey')
    })

    test('handles undefined values as missing', () => {
      const validator = new ConfigValidator()
      const result = validator.validateProvider('email', {
        type: 'sendgrid',
        apiKey: undefined,
      })
      expect(result).toHaveLength(1)
      expect(result[0]?.missingFields).toContain('apiKey')
    })

    test('validates deeply nested fields correctly', () => {
      const validator = new ConfigValidator()

      // Empty nested object reports generic alternative requirement
      // (none of the alternatives are partially filled)
      const empty = validator.validateProvider('push', {
        type: 'apn',
        token: {},
      })
      expect(empty).toHaveLength(1)
      expect(empty[0]?.message).toContain('token authentication')

      // Partial nested fields - at least one field present in alternative
      const partial = validator.validateProvider('webpush', {
        type: 'gcm',
        vapidDetails: {
          subject: 'test',
        },
      })
      expect(partial).toHaveLength(1)
      expect(partial[0]?.missingFields).toContain('vapidDetails.publicKey')
      expect(partial[0]?.missingFields).toContain('vapidDetails.privateKey')

      // Partial token auth - at least one field present
      const partialToken = validator.validateProvider('push', {
        type: 'apn',
        token: { key: 'key-data' },
      })
      expect(partialToken).toHaveLength(1)
      expect(partialToken[0]?.missingFields).toContain('token.keyId')
      expect(partialToken[0]?.missingFields).toContain('token.teamId')
    })

    test('accepts valid nested configuration', () => {
      const validator = new ConfigValidator()

      const result = validator.validateProvider('push', {
        type: 'apn',
        token: {
          key: 'key-content',
          keyId: 'ABCD1234',
          teamId: 'TEAM1234',
        },
      })
      expect(result).toHaveLength(0)
    })
  })

  describe('PROVIDER_REQUIREMENTS registry', () => {
    test('has requirements for all email providers', () => {
      expect(PROVIDER_REQUIREMENTS.email).toBeDefined()
      expect(PROVIDER_REQUIREMENTS.email.sendgrid).toBeDefined()
      expect(PROVIDER_REQUIREMENTS.email.mailgun).toBeDefined()
      expect(PROVIDER_REQUIREMENTS.email.mandrill).toBeDefined()
      expect(PROVIDER_REQUIREMENTS.email.postmark).toBeDefined()
      expect(PROVIDER_REQUIREMENTS.email.sparkpost).toBeDefined()
      expect(PROVIDER_REQUIREMENTS.email.ses).toBeDefined()
      expect(PROVIDER_REQUIREMENTS.email.smtp).toBeDefined()
      expect(PROVIDER_REQUIREMENTS.email.sendmail).toBeDefined()
    })

    test('has requirements for all SMS providers', () => {
      expect(PROVIDER_REQUIREMENTS.sms).toBeDefined()
      expect(PROVIDER_REQUIREMENTS.sms.twilio).toBeDefined()
      expect(PROVIDER_REQUIREMENTS.sms.nexmo).toBeDefined()
      expect(PROVIDER_REQUIREMENTS.sms.plivo).toBeDefined()
      expect(PROVIDER_REQUIREMENTS.sms.infobip).toBeDefined()
      expect(PROVIDER_REQUIREMENTS.sms.clickatell).toBeDefined()
      expect(PROVIDER_REQUIREMENTS.sms.callr).toBeDefined()
      expect(PROVIDER_REQUIREMENTS.sms.ovh).toBeDefined()
      expect(PROVIDER_REQUIREMENTS.sms.seven).toBeDefined()
      expect(PROVIDER_REQUIREMENTS.sms['46elks']).toBeDefined()
    })

    test('has requirements for all push providers', () => {
      expect(PROVIDER_REQUIREMENTS.push).toBeDefined()
      expect(PROVIDER_REQUIREMENTS.push.fcm).toBeDefined()
      expect(PROVIDER_REQUIREMENTS.push.apn).toBeDefined()
      expect(PROVIDER_REQUIREMENTS.push.adm).toBeDefined()
      expect(PROVIDER_REQUIREMENTS.push.wns).toBeDefined()
    })

    test('has requirements for voice providers', () => {
      expect(PROVIDER_REQUIREMENTS.voice).toBeDefined()
      expect(PROVIDER_REQUIREMENTS.voice.twilio).toBeDefined()
    })

    test('has requirements for webpush providers', () => {
      expect(PROVIDER_REQUIREMENTS.webpush).toBeDefined()
      expect(PROVIDER_REQUIREMENTS.webpush.gcm).toBeDefined()
    })

    test('has requirements for slack providers', () => {
      expect(PROVIDER_REQUIREMENTS.slack).toBeDefined()
      expect(PROVIDER_REQUIREMENTS.slack.slack).toBeDefined()
    })

    test('has requirements for whatsapp providers', () => {
      expect(PROVIDER_REQUIREMENTS.whatsapp).toBeDefined()
      expect(PROVIDER_REQUIREMENTS.whatsapp.infobip).toBeDefined()
    })

    test('all requirements have descriptions', () => {
      for (const [, channelReqs] of Object.entries(PROVIDER_REQUIREMENTS)) {
        for (const [provider, req] of Object.entries(channelReqs)) {
          expect(req.description, `Provider ${provider} should have description`).toBeDefined()
          expect(typeof req.description).toBe('string')
          expect(req.description.length).toBeGreaterThan(0)
        }
      }
    })
  })
})
