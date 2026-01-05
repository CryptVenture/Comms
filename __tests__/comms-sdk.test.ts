import { describe, vi, test, expect } from 'vitest'
import CommsSdk from '../src'
import { ConfigurationError } from '../src/types/errors'

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

describe('CommsSdk construction-time validation', () => {
  describe('valid configurations', () => {
    test('accepts empty config', () => {
      expect(() => new CommsSdk({})).not.toThrow()
    })

    test('accepts config with only logger providers', () => {
      expect(
        () =>
          new CommsSdk({
            channels: {
              email: { providers: [{ type: 'logger' }] },
              sms: { providers: [{ type: 'logger' }] },
            },
          })
      ).not.toThrow()
    })

    test('accepts config with properly configured email provider', () => {
      expect(
        () =>
          new CommsSdk({
            channels: {
              email: { providers: [{ type: 'sendgrid', apiKey: 'test-api-key' }] },
            },
          })
      ).not.toThrow()
    })

    test('accepts config with properly configured SMS provider', () => {
      expect(
        () =>
          new CommsSdk({
            channels: {
              sms: { providers: [{ type: 'twilio', accountSid: 'sid', authToken: 'token' }] },
            },
          })
      ).not.toThrow()
    })

    test('accepts config with multiple properly configured channels', () => {
      expect(
        () =>
          new CommsSdk({
            channels: {
              email: { providers: [{ type: 'sendgrid', apiKey: 'key' }] },
              sms: { providers: [{ type: 'twilio', accountSid: 'sid', authToken: 'token' }] },
              push: { providers: [{ type: 'fcm', id: 'fcm-id' }] },
            },
          })
      ).not.toThrow()
    })

    test('accepts useNotificationCatcher config', () => {
      expect(() => new CommsSdk({ useNotificationCatcher: true })).not.toThrow()
    })
  })

  describe('invalid configurations throw ConfigurationError', () => {
    test('throws for missing email sendgrid apiKey', () => {
      expect(
        () =>
          new CommsSdk({
            channels: {
              email: { providers: [{ type: 'sendgrid' }] },
            },
          })
      ).toThrow(ConfigurationError)
    })

    test('throws for missing email mailgun credentials', () => {
      expect(
        () =>
          new CommsSdk({
            channels: {
              email: { providers: [{ type: 'mailgun' }] },
            },
          })
      ).toThrow(ConfigurationError)
    })

    test('throws for missing SMS twilio credentials', () => {
      expect(
        () =>
          new CommsSdk({
            channels: {
              sms: { providers: [{ type: 'twilio' }] },
            },
          })
      ).toThrow(ConfigurationError)
    })

    test('throws for missing push FCM id', () => {
      expect(
        () =>
          new CommsSdk({
            channels: {
              push: { providers: [{ type: 'fcm' }] },
            },
          })
      ).toThrow(ConfigurationError)
    })

    test('throws for missing voice twilio credentials', () => {
      expect(
        () =>
          new CommsSdk({
            channels: {
              voice: { providers: [{ type: 'twilio' }] },
            },
          })
      ).toThrow(ConfigurationError)
    })

    test('throws for missing slack webhookUrl', () => {
      expect(
        () =>
          new CommsSdk({
            channels: {
              slack: { providers: [{ type: 'slack' }] },
            },
          })
      ).toThrow(ConfigurationError)
    })

    test('throws for missing whatsapp infobip credentials', () => {
      expect(
        () =>
          new CommsSdk({
            channels: {
              whatsapp: { providers: [{ type: 'infobip' }] },
            },
          })
      ).toThrow(ConfigurationError)
    })

    test('throws for missing webpush gcm credentials', () => {
      expect(
        () =>
          new CommsSdk({
            channels: {
              webpush: { providers: [{ type: 'gcm' }] },
            },
          })
      ).toThrow(ConfigurationError)
    })

    test('throws for empty string values', () => {
      expect(
        () =>
          new CommsSdk({
            channels: {
              email: { providers: [{ type: 'sendgrid', apiKey: '' }] },
            },
          })
      ).toThrow(ConfigurationError)
    })
  })

  describe('ConfigurationError properties', () => {
    test('error has INVALID_CONFIG code', () => {
      try {
        new CommsSdk({
          channels: {
            email: { providers: [{ type: 'sendgrid' }] },
          },
        })
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError)
        expect((error as ConfigurationError).code).toBe('INVALID_CONFIG')
      }
    })

    test('error has issues array', () => {
      try {
        new CommsSdk({
          channels: {
            email: { providers: [{ type: 'sendgrid' }] },
          },
        })
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError)
        const configError = error as ConfigurationError
        expect(configError.issues).toBeDefined()
        expect(Array.isArray(configError.issues)).toBe(true)
        expect(configError.issues!.length).toBeGreaterThan(0)
      }
    })

    test('error has channel property from first issue', () => {
      try {
        new CommsSdk({
          channels: {
            email: { providers: [{ type: 'sendgrid' }] },
          },
        })
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError)
        expect((error as ConfigurationError).channel).toBe('email')
      }
    })

    test('error has providerType property from first issue', () => {
      try {
        new CommsSdk({
          channels: {
            email: { providers: [{ type: 'sendgrid' }] },
          },
        })
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError)
        expect((error as ConfigurationError).providerType).toBe('sendgrid')
      }
    })

    test('error has missingFields property from first issue', () => {
      try {
        new CommsSdk({
          channels: {
            email: { providers: [{ type: 'sendgrid' }] },
          },
        })
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError)
        const configError = error as ConfigurationError
        expect(configError.missingFields).toBeDefined()
        expect(configError.missingFields).toContain('apiKey')
      }
    })

    test('error message contains helpful information', () => {
      try {
        new CommsSdk({
          channels: {
            email: { providers: [{ type: 'sendgrid' }] },
          },
        })
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError)
        const message = (error as ConfigurationError).message
        expect(message).toContain('email')
        expect(message).toContain('sendgrid')
        expect(message).toContain('apiKey')
      }
    })
  })

  describe('multiple validation issues', () => {
    test('detects issues across multiple channels', () => {
      try {
        new CommsSdk({
          channels: {
            email: { providers: [{ type: 'sendgrid' }] },
            sms: { providers: [{ type: 'twilio' }] },
          },
        })
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError)
        const configError = error as ConfigurationError
        expect(configError.issues).toBeDefined()
        expect(configError.issues!.length).toBe(2)
        const channels = configError.issues!.map((i) => i.channel)
        expect(channels).toContain('email')
        expect(channels).toContain('sms')
      }
    })

    test('detects issues in multiple providers within same channel', () => {
      try {
        new CommsSdk({
          channels: {
            email: {
              providers: [{ type: 'sendgrid' }, { type: 'mailgun' }],
            },
          },
        })
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError)
        const configError = error as ConfigurationError
        expect(configError.issues).toBeDefined()
        expect(configError.issues!.length).toBe(2)
        const providerTypes = configError.issues!.map((i) => i.providerType)
        expect(providerTypes).toContain('sendgrid')
        expect(providerTypes).toContain('mailgun')
      }
    })

    test('allows mixing valid and invalid providers - still throws for invalid ones', () => {
      try {
        new CommsSdk({
          channels: {
            email: {
              providers: [
                { type: 'sendgrid', apiKey: 'valid-key' },
                { type: 'mailgun' }, // Missing credentials
              ],
            },
          },
        })
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError)
        const configError = error as ConfigurationError
        expect(configError.issues).toBeDefined()
        expect(configError.issues!.length).toBe(1)
        expect(configError.issues![0]?.providerType).toBe('mailgun')
      }
    })
  })

  describe('specific provider validation scenarios', () => {
    test('mailgun requires both apiKey and domainName', () => {
      // Only apiKey
      try {
        new CommsSdk({
          channels: {
            email: { providers: [{ type: 'mailgun', apiKey: 'key' }] },
          },
        })
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError)
        expect((error as ConfigurationError).missingFields).toContain('domainName')
      }

      // Only domainName
      try {
        new CommsSdk({
          channels: {
            email: { providers: [{ type: 'mailgun', domainName: 'domain.com' } as any] },
          },
        })
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError)
        expect((error as ConfigurationError).missingFields).toContain('apiKey')
      }
    })

    test('twilio SMS requires both accountSid and authToken', () => {
      // Only accountSid
      try {
        new CommsSdk({
          channels: {
            sms: { providers: [{ type: 'twilio', accountSid: 'sid' } as any] },
          },
        })
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError)
        expect((error as ConfigurationError).missingFields).toContain('authToken')
      }

      // Only authToken
      try {
        new CommsSdk({
          channels: {
            sms: { providers: [{ type: 'twilio', authToken: 'token' } as any] },
          },
        })
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError)
        expect((error as ConfigurationError).missingFields).toContain('accountSid')
      }
    })

    test('twilio voice requires both accountSid and authToken', () => {
      // Only accountSid
      try {
        new CommsSdk({
          channels: {
            voice: { providers: [{ type: 'twilio', accountSid: 'sid' } as any] },
          },
        })
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError)
        expect((error as ConfigurationError).missingFields).toContain('authToken')
      }

      // Only authToken
      try {
        new CommsSdk({
          channels: {
            voice: { providers: [{ type: 'twilio', authToken: 'token' } as any] },
          },
        })
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError)
        expect((error as ConfigurationError).missingFields).toContain('accountSid')
      }
    })
  })
})
