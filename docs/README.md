# WebVentures Comms SDK v2.0.0 - Complete Documentation

> Unified notification SDK for Node.js, Next.js 16+, React 19, React Native, and Expo

[![npm version](https://img.shields.io/npm/v/@webventures/comms.svg)](https://www.npmjs.com/package/@webventures/comms)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Supported Channels](#supported-channels)
- [Multi-Provider Strategies](#multi-provider-strategies)
- [Configuration](#configuration)
- [Sending Notifications](#sending-notifications)
- [Error Handling](#error-handling)
- [TypeScript Support](#typescript-support)
- [Framework Integration](#framework-integration)
- [Related Documentation](#related-documentation)

## Overview

WebVentures Comms SDK is a powerful, type-safe notification library that provides a unified interface for sending transactional notifications across multiple channels and providers. Built with TypeScript, it offers first-class support for modern frameworks including Next.js 16+, React 19, React Native, and Expo.

### Why WebVentures Comms SDK?

- **Unified API**: Single interface for all notification channels (email, SMS, push, voice, webpush, Slack, WhatsApp)
- **Multi-Provider Support**: Built-in fallback and round-robin strategies for high availability
- **Framework-First**: Optimized adapters for Next.js, React Native, Expo, and more
- **Type-Safe**: Full TypeScript support with comprehensive type definitions
- **Production-Ready**: Battle-tested error handling, logging, and provider abstraction
- **Developer-Friendly**: Local testing with Notification Catcher, extensive documentation

## Features

### Supported Channels

- **Email**: SMTP, SendGrid, AWS SES, Mailgun, Mandrill, SparkPost, Sendmail
- **SMS**: Twilio, Nexmo/Vonage, Plivo, Infobip, OVH, Callr, Clickatell, 46elks, Seven
- **Push**: APNs (iOS), FCM (Android/iOS), WNS (Windows), ADM (Amazon)
- **Voice**: Twilio voice calls
- **Webpush**: Browser push notifications (GCM)
- **Slack**: Webhook-based messaging
- **WhatsApp**: Infobip integration

### Multi-Provider Strategies

- **Fallback**: Automatic failover to backup providers
- **Round-robin**: Load balancing across providers
- **No-fallback**: Single provider with no failover
- **Custom**: Define your own provider selection logic

### Framework Support

- **Next.js 16+**: Server Components, Server Actions, API Routes
- **React 19**: Full compatibility with latest React features
- **React Native**: Native mobile app integration
- **Expo**: Simplified React Native setup
- **Node.js**: Standard Node.js 18+ applications

## Installation

```bash
# Using npm
npm install @webventures/comms

# Using yarn
yarn add @webventures/comms

# Using pnpm
pnpm add @webventures/comms
```

### Development Dependencies (Optional)

For local testing with Notification Catcher:

```bash
npm install --save-dev notification-catcher
```

## Quick Start

### Basic Email Sending

```typescript
import CommsSdk from '@webventures/comms'

// Initialize SDK
const comms = new CommsSdk({
  channels: {
    email: {
      providers: [
        {
          type: 'smtp',
          host: 'smtp.gmail.com',
          port: 587,
          auth: {
            user: 'your-email@gmail.com',
            pass: 'your-password',
          },
        },
      ],
    },
  },
})

// Send email
const result = await comms.send({
  email: {
    from: 'noreply@example.com',
    to: 'user@example.com',
    subject: 'Welcome to WebVentures!',
    html: '<h1>Hello!</h1><p>Welcome to our platform.</p>',
  },
})

console.log(result)
// { status: 'success', channels: { email: { id: 'msg-123', providerId: 'smtp-provider' } } }
```

### Multi-Channel Notification

```typescript
const comms = new CommsSdk({
  channels: {
    email: {
      providers: [{ type: 'sendgrid', apiKey: process.env.SENDGRID_API_KEY }],
    },
    sms: {
      providers: [{ type: 'twilio', accountSid: '...', authToken: '...' }],
    },
    push: {
      providers: [{ type: 'fcm', id: 'your-fcm-server-key' }],
    },
  },
})

// Send notification via multiple channels
const result = await comms.send({
  email: {
    from: 'noreply@example.com',
    to: 'user@example.com',
    subject: 'New Message',
    text: 'You have a new message!',
  },
  sms: {
    from: '+1234567890',
    to: '+0987654321',
    text: 'You have a new message!',
  },
  push: {
    registrationToken: 'device-token',
    title: 'New Message',
    body: 'You have a new message!',
  },
})
```

### With Fallback Strategy

```typescript
const comms = new CommsSdk({
  channels: {
    email: {
      multiProviderStrategy: 'fallback',
      providers: [
        { type: 'sendgrid', apiKey: process.env.SENDGRID_API_KEY },
        { type: 'ses', region: 'us-east-1', accessKeyId: '...', secretAccessKey: '...' },
        { type: 'mailgun', apiKey: '...', domainName: 'example.com' },
      ],
    },
  },
})

// If SendGrid fails, automatically tries SES, then Mailgun
const result = await comms.send({
  email: {
    from: 'noreply@example.com',
    to: 'user@example.com',
    subject: 'Important Notification',
    text: 'This is important!',
  },
})
```

## Supported Channels

### Email

Send rich HTML emails with attachments, CC/BCC, custom headers, and more.

```typescript
await comms.send({
  email: {
    from: 'noreply@example.com',
    to: 'user@example.com',
    subject: 'Invoice #12345',
    html: '<h1>Your Invoice</h1>',
    attachments: [
      {
        filename: 'invoice.pdf',
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
    cc: ['manager@example.com'],
    bcc: ['accounting@example.com'],
  },
})
```

**Supported Providers**: SMTP, SendGrid, AWS SES, Mailgun, Mandrill, SparkPost, Sendmail

[See Email Provider Configuration →](./PROVIDERS.md#email-providers)

### SMS

Send text messages to any phone number worldwide.

```typescript
await comms.send({
  sms: {
    from: '+1234567890',
    to: '+0987654321',
    text: 'Your verification code is: 123456',
    type: 'text', // or 'unicode' for international characters
    nature: 'transactional', // or 'marketing'
  },
})
```

**Supported Providers**: Twilio, Nexmo/Vonage, Plivo, Infobip, OVH, Callr, Clickatell, 46elks, Seven

[See SMS Provider Configuration →](./PROVIDERS.md#sms-providers)

### Push Notifications

Send mobile push notifications to iOS, Android, and Windows devices.

```typescript
await comms.send({
  push: {
    registrationToken: 'device-fcm-token',
    title: 'New Message',
    body: 'You have a new message from John',
    icon: 'https://example.com/icon.png',
    badge: 1,
    sound: 'default',
    priority: 'high',
    custom: {
      // Custom data payload
      userId: '123',
      messageId: '456',
    },
  },
})
```

**Supported Providers**: APNs (iOS), FCM (Android/iOS), WNS (Windows), ADM (Amazon Fire)

[See Push Provider Configuration →](./PROVIDERS.md#push-providers)

### Voice

Make automated voice calls with custom scripts.

```typescript
await comms.send({
  voice: {
    from: '+1234567890',
    to: '+0987654321',
    url: 'https://example.com/voice-script.xml', // TwiML or equivalent
    method: 'GET',
  },
})
```

**Supported Providers**: Twilio

[See Voice Provider Configuration →](./PROVIDERS.md#voice-providers)

### Webpush

Send browser push notifications (Chrome, Firefox, Safari).

```typescript
await comms.send({
  webpush: {
    subscription: {
      endpoint: 'https://fcm.googleapis.com/fcm/send/...',
      keys: {
        auth: 'base64-auth-key',
        p256dh: 'base64-p256dh-key',
      },
    },
    title: 'New Notification',
    body: 'You have a new notification',
    icon: '/icon.png',
    badge: '/badge.png',
    requireInteraction: true,
  },
})
```

**Supported Providers**: GCM (with W3C endpoints)

[See Webpush Provider Configuration →](./PROVIDERS.md#webpush-providers)

### Slack

Send messages to Slack channels via webhooks.

```typescript
await comms.send({
  slack: {
    text: 'Deployment completed successfully! :tada:',
    attachments: [
      {
        color: 'good',
        title: 'Production Deployment',
        text: 'Version 2.0.0 is now live',
        fields: [
          { title: 'Environment', value: 'Production', short: true },
          { title: 'Version', value: '2.0.0', short: true },
        ],
      },
    ],
  },
})
```

**Supported Providers**: Webhook

[See Slack Provider Configuration →](./PROVIDERS.md#slack-providers)

### WhatsApp

Send WhatsApp messages via Infobip.

```typescript
await comms.send({
  whatsapp: {
    from: '1234567890',
    to: '0987654321',
    type: 'text',
    text: 'Hello from WhatsApp!',
  },
})
```

**Supported Providers**: Infobip

[See WhatsApp Provider Configuration →](./PROVIDERS.md#whatsapp-providers)

## Multi-Provider Strategies

### Fallback Strategy

Automatically tries providers in sequence until one succeeds.

```typescript
const comms = new CommsSdk({
  channels: {
    email: {
      multiProviderStrategy: 'fallback',
      providers: [
        { type: 'sendgrid', apiKey: 'primary-key' },
        { type: 'mailgun', apiKey: 'backup-key', domainName: 'example.com' },
      ],
    },
  },
})
```

**Use Cases**:

- High availability email sending
- Provider redundancy
- Cost optimization with fallback to cheaper providers

### Round-Robin Strategy

Load balances across providers by rotating through them.

```typescript
const comms = new CommsSdk({
  channels: {
    sms: {
      multiProviderStrategy: 'roundrobin',
      providers: [
        { type: 'twilio', accountSid: '...', authToken: '...' },
        { type: 'nexmo', apiKey: '...', apiSecret: '...' },
      ],
    },
  },
})
```

**Use Cases**:

- Distribute load across multiple providers
- Prevent rate limiting
- Geographic optimization

### No-Fallback Strategy

Uses only the first provider, throws error immediately on failure.

```typescript
const comms = new CommsSdk({
  channels: {
    email: {
      multiProviderStrategy: 'no-fallback',
      providers: [{ type: 'sendgrid', apiKey: 'key' }],
    },
  },
})
```

**Use Cases**:

- Cost-sensitive operations
- Strict provider requirements
- Debugging and testing

### Custom Strategy

Define your own provider selection logic.

```typescript
import type { StrategyFunction } from '@webventures/comms'

const customStrategy: StrategyFunction = (providers) => {
  return async (request) => {
    // Custom logic - e.g., choose provider based on recipient
    const provider = selectProviderBasedOnRequest(request, providers)

    try {
      const id = await provider.send(request)
      return { id, providerId: provider.id }
    } catch (error) {
      error.providerId = provider.id
      throw error
    }
  }
}

const comms = new CommsSdk({
  channels: {
    email: {
      multiProviderStrategy: customStrategy,
      providers: [...]
    }
  }
})
```

[See Strategy Examples →](./EXAMPLES.md#custom-strategies)

## Configuration

### SDK Configuration

```typescript
interface CommsSdkConfig {
  // Enable notification catcher for local development
  useNotificationCatcher?: boolean

  // Channel-specific configurations
  channels?: {
    email?: ChannelConfig
    sms?: ChannelConfig
    push?: ChannelConfig
    voice?: ChannelConfig
    webpush?: ChannelConfig
    slack?: ChannelConfig
    whatsapp?: ChannelConfig
  }
}

interface ChannelConfig {
  providers: ProviderConfig[]
  multiProviderStrategy?: 'fallback' | 'roundrobin' | 'no-fallback' | StrategyFunction
}
```

### Environment Variables

```bash
# HTTP proxy for all requests
COMMS_HTTP_PROXY=http://127.0.0.1:8580

# Custom notification catcher SMTP URL
COMMS_CATCHER_OPTIONS=smtp://127.0.0.1:1025?ignoreTLS=true
```

### Logger Configuration

```typescript
import CommsSdk from '@webventures/comms'
import winston from 'winston'

const comms = new CommsSdk({...})

// Mute all logs
comms.logger.mute()

// Custom logger configuration
comms.logger.configure([
  new winston.transports.File({ filename: 'notifications.log' }),
  new winston.transports.Console({ level: 'error' })
])
```

## Sending Notifications

### Response Format

All `send()` calls return a `NotificationStatus` object:

```typescript
interface NotificationStatus {
  status: 'success' | 'error'
  channels?: {
    [channel: string]: {
      id: string | undefined
      providerId: string | undefined
    }
  }
  errors?: {
    [channel: string]: Error
  }
}
```

### Success Response

```typescript
const result = await comms.send({
  email: { from: '...', to: '...', subject: '...', text: '...' },
})

// {
//   status: 'success',
//   channels: {
//     email: {
//       id: 'msg-123456',
//       providerId: 'sendgrid-provider'
//     }
//   }
// }
```

### Error Response

```typescript
const result = await comms.send({
  email: { from: '...', to: '...', subject: '...', text: '...' },
})

// {
//   status: 'error',
//   channels: {
//     email: {
//       id: undefined,
//       providerId: 'sendgrid-provider'
//     }
//   },
//   errors: {
//     email: Error('Provider error: Invalid API key')
//   }
// }
```

### Helper Functions

```typescript
import { isSuccessResponse, isErrorResponse, getErrors, getChannelIds } from '@webventures/comms'

const result = await comms.send({...})

// Type guards
if (isSuccessResponse(result)) {
  console.log('Success!')
}

if (isErrorResponse(result)) {
  console.error('Failed!')
}

// Extract errors
const errors = getErrors(result) // Error[]

// Extract channel IDs
const ids = getChannelIds(result) // { email?: string, sms?: string, ... }
```

## Error Handling

### Error Types

```typescript
import {
  CommsError,
  ProviderError,
  ConfigurationError,
  ValidationError,
  NetworkError,
  isCommsError,
  isProviderError
} from '@webventures/comms'

try {
  await comms.send({...})
} catch (error) {
  if (isProviderError(error)) {
    console.error(`Provider ${error.providerId} failed:`, error.message)
    console.error(`Channel: ${error.channel}`)
  } else if (isCommsError(error)) {
    console.error('SDK Error:', error.code, error.message)
  }
}
```

### Error Handling Patterns

```typescript
// Pattern 1: Check response status
const result = await comms.send({...})
if (result.status === 'error') {
  console.error('Notification failed:', result.errors)
  // Handle errors per channel
  if (result.errors?.email) {
    console.error('Email error:', result.errors.email)
  }
}

// Pattern 2: Use type guards
if (isErrorResponse(result)) {
  const errors = getErrors(result)
  errors.forEach(error => {
    console.error('Error:', error.message)
  })
}

// Pattern 3: Retry logic
async function sendWithRetry(request, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const result = await comms.send(request)
    if (result.status === 'success') {
      return result
    }
    if (i < maxRetries - 1) {
      await sleep(1000 * Math.pow(2, i)) // Exponential backoff
    }
  }
  throw new Error('Max retries exceeded')
}
```

## TypeScript Support

WebVentures Comms SDK is written in TypeScript and provides comprehensive type definitions.

### Type-Safe Configuration

```typescript
import CommsSdk, { CommsSdkConfig, EmailProvider } from '@webventures/comms'

const config: CommsSdkConfig = {
  channels: {
    email: {
      providers: [
        {
          type: 'sendgrid',
          apiKey: 'your-key',
        },
      ] satisfies EmailProvider[],
    },
  },
}

const comms = new CommsSdk(config)
```

### Type-Safe Requests

```typescript
import type { EmailRequest, SmsRequest, NotificationRequest } from '@webventures/comms'

const emailRequest: EmailRequest = {
  from: 'noreply@example.com',
  to: 'user@example.com',
  subject: 'Hello',
  text: 'Hello World',
}

const smsRequest: SmsRequest = {
  from: '+1234567890',
  to: '+0987654321',
  text: 'Hello',
}

// Combined request
const request: NotificationRequest = {
  email: emailRequest,
  sms: smsRequest,
}

await comms.send(request)
```

### Exported Types

```typescript
// Configuration types
import type {
  CommsSdkConfig,
  ChannelConfig,
  ProviderConfig,
  EnvironmentConfig,
} from '@webventures/comms'

// Request types
import type {
  EmailRequest,
  SmsRequest,
  PushRequest,
  VoiceRequest,
  WebpushRequest,
  SlackRequest,
  WhatsappRequest,
  NotificationRequest,
} from '@webventures/comms'

// Response types
import type { NotificationStatus, ChannelStatus, NotificationStatusType } from '@webventures/comms'

// Provider types
import type {
  EmailProvider,
  SmsProvider,
  PushProvider,
  VoiceProvider,
  WebpushProvider,
  SlackProvider,
  WhatsappProvider,
} from '@webventures/comms'

// Strategy types
import type { StrategyFunction } from '@webventures/comms'

// Error types
import {
  CommsError,
  ProviderError,
  ConfigurationError,
  ValidationError,
  NetworkError,
} from '@webventures/comms'
```

## Framework Integration

### Next.js 16+ (Server Components & Server Actions)

```typescript
import { createNextJSComms } from '@webventures/comms/adapters'

export async function sendWelcomeEmail(email: string) {
  'use server'

  const comms = createNextJSComms({
    channels: {
      email: {
        providers: [{ type: 'sendgrid', apiKey: process.env.SENDGRID_API_KEY! }],
      },
    },
  })

  return await comms.send({
    email: {
      from: 'noreply@example.com',
      to: email,
      subject: 'Welcome!',
      text: 'Thanks for signing up!',
    },
  })
}
```

[See Complete Next.js Guide →](./FRAMEWORKS.md#nextjs)

### React 19

```typescript
import CommsSdk from '@webventures/comms'

function MyComponent() {
  const handleSend = async () => {
    // Call your API endpoint or server action
    await sendNotification(...)
  }

  return <button onClick={handleSend}>Send</button>
}
```

[See Complete React Guide →](./FRAMEWORKS.md#react-19)

### React Native

```typescript
import { createReactNativeComms } from '@webventures/comms/adapters'

const comms = createReactNativeComms({
  // Configuration
})
```

[See Complete React Native Guide →](./FRAMEWORKS.md#react-native)

### Expo

```typescript
import { createExpoComms } from '@webventures/comms/adapters'

const comms = createExpoComms({
  // Configuration
})
```

[See Complete Expo Guide →](./FRAMEWORKS.md#expo)

### Node.js

```typescript
import CommsSdk from '@webventures/comms'

const comms = new CommsSdk({
  // Standard configuration
})
```

[See Complete Node.js Guide →](./FRAMEWORKS.md#nodejs)

## Local Development

### Notification Catcher

For local testing, use Notification Catcher to intercept and view all notifications in a web interface.

```bash
# Install
npm install --save-dev notification-catcher

# Start catcher
npx notification-catcher
```

Then configure SDK:

```typescript
const comms = new CommsSdk({
  useNotificationCatcher: true,
})

// All notifications will be sent to http://localhost:1080
```

Or with custom settings:

```bash
# Custom port
COMMS_CATCHER_OPTIONS=smtp://127.0.0.1:3025?ignoreTLS=true node your-app.js
```

## Related Documentation

- [API Reference](./API.md) - Complete API documentation
- [Framework Guides](./FRAMEWORKS.md) - Next.js, React, React Native, Expo integration
- [Provider Configuration](./PROVIDERS.md) - Detailed provider setup for all channels
- [Migration Guide](./MIGRATION.md) - Upgrading from v1.x to v2.0.0
- [Architecture](./ARCHITECTURE.md) - Technical architecture and design patterns
- [Examples](./EXAMPLES.md) - Comprehensive code examples

## Support & Community

- [GitHub Issues](https://github.com/CryptVenture/Comms/issues)
- [GitHub Discussions](https://github.com/CryptVenture/Comms/discussions)
- [npm Package](https://www.npmjs.com/package/@webventures/comms)

## License

MIT License - see [LICENSE](../LICENSE) file for details.
