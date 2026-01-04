<div align="center">

# 📨 WebVentures Comms SDK

### Unified Communication SDK for Modern Applications

**Send emails, SMS, push notifications, and more with a single, type-safe API**

[![npm version](https://img.shields.io/npm/v/@webventures/comms.svg?style=flat-square)](https://www.npmjs.com/package/@webventures/comms)
[![npm downloads](https://img.shields.io/npm/dm/@webventures/comms.svg?style=flat-square)](https://www.npmjs.com/package/@webventures/comms)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg?style=flat-square)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg?style=flat-square)](https://nodejs.org/)
[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](./LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/CryptVenture/Comms/ci-test.yml?branch=main&style=flat-square&label=CI)](https://github.com/CryptVenture/Comms/actions)

[Features](#-features) • [Installation](#-installation) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Examples](#-examples)

</div>

---

## 🎯 Overview

**WebVentures Comms SDK** is a production-ready, type-safe communication library that provides a unified interface for sending transactional notifications across multiple channels and providers. Built entirely in TypeScript with first-class support for modern frameworks.

### Why WebVentures Comms SDK?

```typescript
// One SDK, multiple channels, full type safety
import CommsSdk from '@webventures/comms'

const comms = new CommsSdk({
  channels: {
    email: { providers: [{ type: 'sendgrid', apiKey: process.env.SENDGRID_KEY }] },
    sms: { providers: [{ type: 'twilio', accountSid: '...', authToken: '...' }] },
    push: { providers: [{ type: 'fcm', id: 'your-fcm-key' }] },
  },
})

// Send notifications with intelligent fallback
await comms.send({
  email: { to: 'user@example.com', subject: 'Welcome!', html: '<h1>Hello!</h1>' },
  sms: { to: '+1234567890', text: 'Welcome to WebVentures!' },
  push: { registrationToken: 'device-token', title: 'Welcome!', body: 'Get started' },
})
```

### Key Benefits

| Feature                   | Description                                                     |
| ------------------------- | --------------------------------------------------------------- |
| **🎯 Unified API**        | Single interface for all notification channels                  |
| **🛡️ Type-Safe**          | Full TypeScript support with comprehensive IntelliSense         |
| **⚡ Multi-Provider**     | Built-in failover & load balancing across 40+ providers         |
| **🚀 Framework-First**    | Optimized for Next.js 16+, React 19, React Native, Expo         |
| **🔧 Production-Ready**   | Battle-tested error handling, logging, and provider abstraction |
| **🎨 Developer-Friendly** | Local testing tools, extensive docs, and real-world examples    |
| **📦 Tree-Shakeable**     | Modular exports for optimal bundle size                         |
| **🔌 Extensible**         | Custom providers and strategies support                         |

---

## ✨ Features

### 📬 Supported Channels

<table>
<tr>
<td width="25%" align="center">

### 📧 Email

SMTP, SendGrid, AWS SES, Mailgun, Mandrill, SparkPost, Sendmail

</td>
<td width="25%" align="center">

### 💬 SMS

Twilio, Vonage, Plivo, Infobip, OVH, Callr, Clickatell, 46elks, Seven

</td>
<td width="25%" align="center">

### 📱 Push

APNs (iOS), FCM (Android/iOS), WNS (Windows), ADM (Amazon)

</td>
<td width="25%" align="center">

### 🔊 Voice

Twilio Voice with TwiML support

</td>
</tr>
<tr>
<td width="25%" align="center">

### 🌐 Webpush

Web Push with VAPID authentication

</td>
<td width="25%" align="center">

### 💼 Slack

Webhook integration with rich formatting

</td>
<td width="25%" align="center">

### 💚 WhatsApp

Infobip WhatsApp Business API

</td>
<td width="25%" align="center">

### 🎯 Custom

Build your own providers

</td>
</tr>
</table>

### 🏗️ Framework Support

- **Next.js 16+** - Server Components, Server Actions, API Routes, Edge Runtime
- **React 19** - Latest React with full concurrent features
- **React Native** - Native mobile app integration
- **Expo** - Managed React Native workflow with push notifications
- **Node.js 18+** - Standard Node.js applications, CLI tools, serverless

### 🔄 Multi-Provider Strategies

| Strategy        | Description                            | Use Case                         |
| --------------- | -------------------------------------- | -------------------------------- |
| **Fallback**    | Automatic failover to backup providers | High availability, 99.9% uptime  |
| **Round-robin** | Load balancing across providers        | Cost optimization, rate limiting |
| **No-fallback** | Single provider with immediate errors  | Testing, debugging               |
| **Custom**      | Define your own selection logic        | Geographic routing, A/B testing  |

---

## 🚀 Installation

```bash
# Using npm
npm install @webventures/comms

# Using yarn
yarn add @webventures/comms

# Using pnpm
pnpm add @webventures/comms
```

### Requirements

- **Node.js**: 18.0.0 or higher
- **TypeScript**: 5.0.0 or higher (optional)

### Optional Development Tools

For local testing:

```bash
npm install --save-dev notification-catcher
```

---

## ⚡ Quick Start

### 1. Basic Email Sending

```typescript
import CommsSdk from '@webventures/comms'

const comms = new CommsSdk({
  channels: {
    email: {
      providers: [
        {
          type: 'sendgrid',
          apiKey: process.env.SENDGRID_API_KEY,
        },
      ],
    },
  },
})

const result = await comms.send({
  email: {
    from: 'noreply@example.com',
    to: 'user@example.com',
    subject: 'Welcome to WebVentures!',
    html: '<h1>Hello!</h1><p>Thanks for signing up.</p>',
  },
})

console.log(result)
// { status: 'success', channels: { email: { id: 'msg-123', providerId: 'sendgrid' } } }
```

### 2. Multi-Channel with High Availability

```typescript
const comms = new CommsSdk({
  channels: {
    email: {
      multiProviderStrategy: 'fallback', // Automatic failover
      providers: [
        { type: 'sendgrid', apiKey: process.env.SENDGRID_KEY }, // Primary
        { type: 'ses', region: 'us-east-1', accessKeyId: '...', secretAccessKey: '...' }, // Backup
        { type: 'mailgun', apiKey: '...', domainName: 'mg.example.com' }, // Fallback
      ],
    },
    sms: {
      providers: [
        {
          type: 'twilio',
          accountSid: process.env.TWILIO_SID,
          authToken: process.env.TWILIO_TOKEN,
        },
      ],
    },
  },
})

// If SendGrid fails, automatically tries SES, then Mailgun
await comms.send({
  email: {
    from: 'alerts@example.com',
    to: 'user@example.com',
    subject: 'Critical Alert',
    text: 'Your account requires immediate attention.',
  },
  sms: {
    from: '+1234567890',
    to: '+0987654321',
    text: 'Critical alert - check your email',
  },
})
```

### 3. Next.js 16+ Server Actions

```typescript
// app/actions/notifications.ts
'use server'

import { createNextJSComms } from '@webventures/comms/adapters'

export async function sendWelcomeEmail(email: string) {
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
      html: '<h1>Thanks for joining!</h1>',
    },
  })
}
```

```typescript
// app/signup/page.tsx
import { sendWelcomeEmail } from '../actions/notifications'

export default function SignupPage() {
  return (
    <form action={async (formData) => {
      'use server'
      const email = formData.get('email') as string
      await sendWelcomeEmail(email)
    }}>
      <input type="email" name="email" required />
      <button type="submit">Sign Up</button>
    </form>
  )
}
```

### 4. React Native Push Notifications

```typescript
import { createReactNativeComms } from '@webventures/comms/adapters'

const comms = createReactNativeComms({
  channels: {
    push: {
      providers: [
        {
          type: 'fcm',
          id: process.env.FCM_SERVER_KEY,
        },
      ],
    },
  },
})

await comms.send({
  push: {
    registrationToken: deviceToken,
    title: 'New Message',
    body: 'You have a new message from John',
    badge: 1,
    sound: 'default',
    custom: {
      messageId: '123',
      type: 'chat',
    },
  },
})
```

---

## 🎨 Framework Integration

### Next.js 16+ (App Router)

```typescript
// lib/comms.ts - Reusable SDK instance
import { withComms } from '@webventures/comms/adapters'

export const sendNotification = withComms(
  async (comms, options) => {
    return await comms.send(options)
  },
  {
    channels: {
      email: {
        providers: [{ type: 'sendgrid', apiKey: process.env.SENDGRID_API_KEY! }],
      },
    },
  }
)
```

```typescript
// app/api/notify/route.ts - API Route
import { sendNotification } from '@/lib/comms'

export async function POST(request: Request) {
  const { email, message } = await request.json()

  const result = await sendNotification({
    email: {
      from: 'noreply@example.com',
      to: email,
      subject: 'Notification',
      text: message,
    },
  })

  return Response.json(result)
}
```

### Expo with Push Notifications

```typescript
import { createExpoComms } from '@webventures/comms/adapters'
import * as Notifications from 'expo-notifications'

const comms = createExpoComms({
  channels: {
    push: {
      providers: [
        {
          type: 'fcm',
          id: process.env.EXPO_FCM_KEY,
        },
      ],
    },
  },
})

// Get push token
const token = (await Notifications.getExpoPushTokenAsync()).data

// Send notification
await comms.send({
  push: {
    registrationToken: token,
    title: 'Expo Notification',
    body: 'Hello from WebVentures Comms!',
  },
})
```

### Node.js Express API

```typescript
import express from 'express'
import { createNodeComms } from '@webventures/comms/adapters'

const app = express()
const comms = createNodeComms({
  channels: {
    email: { providers: [{ type: 'smtp', host: 'smtp.gmail.com', port: 587 }] },
  },
})

app.post('/api/send-email', async (req, res) => {
  const result = await comms.send({
    email: {
      from: 'noreply@example.com',
      to: req.body.email,
      subject: 'Hello',
      text: 'Your message here',
    },
  })

  res.json(result)
})

app.listen(3000)
```

[See complete framework guides →](./docs/FRAMEWORKS.md)

---

## 📘 Documentation

### Complete Guides

- **[📖 Complete Documentation](./docs/README.md)** - Full SDK documentation
- **[📚 API Reference](./docs/API.md)** - Complete API documentation with types
- **[🔧 Framework Integration](./docs/FRAMEWORKS.md)** - Next.js, React, React Native, Expo
- **[⚙️ Provider Configuration](./docs/PROVIDERS.md)** - Detailed setup for 40+ providers
- **[💡 Examples](./docs/EXAMPLES.md)** - Comprehensive code examples
- **[🏗️ Architecture](./docs/ARCHITECTURE.md)** - Technical architecture and patterns
- **[🔄 Migration Guide](./docs/MIGRATION.md)** - Upgrading from other SDKs

### Quick Links

| Topic                     | Link                                                                                   |
| ------------------------- | -------------------------------------------------------------------------------------- |
| Error Handling            | [docs/README.md#error-handling](./docs/README.md#error-handling)                       |
| Multi-Provider Strategies | [docs/README.md#multi-provider-strategies](./docs/README.md#multi-provider-strategies) |
| TypeScript Types          | [docs/API.md#types](./docs/API.md#types)                                               |
| Custom Providers          | [docs/PROVIDERS.md#custom-providers](./docs/PROVIDERS.md#custom-providers)             |
| Production Patterns       | [docs/EXAMPLES.md#production](./docs/EXAMPLES.md#production)                           |
| Testing Guide             | [docs/EXAMPLES.md#testing](./docs/EXAMPLES.md#testing)                                 |

---

## 💡 Examples

### Email with Attachments

```typescript
await comms.send({
  email: {
    from: 'billing@example.com',
    to: 'customer@example.com',
    subject: 'Invoice #12345',
    html: '<h1>Your Invoice</h1><p>Please find attached.</p>',
    attachments: [
      {
        filename: 'invoice.pdf',
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
    cc: ['accounting@example.com'],
    bcc: ['archive@example.com'],
  },
})
```

### SMS with Unicode

```typescript
await comms.send({
  sms: {
    from: '+1234567890',
    to: '+0987654321',
    text: '您的验证码是: 123456',
    type: 'unicode',
  },
})
```

### Push with Rich Notifications

```typescript
await comms.send({
  push: {
    registrationToken: 'device-token',
    title: 'New Message from John',
    body: 'Hey, are you coming to the meeting?',
    icon: 'https://example.com/avatar.png',
    image: 'https://example.com/preview.jpg',
    badge: 5,
    sound: 'default',
    priority: 'high',
    clickAction: 'OPEN_CHAT',
    custom: {
      chatId: '123',
      senderId: '456',
      type: 'chat_message',
    },
  },
})
```

### Slack Rich Messages

```typescript
await comms.send({
  slack: {
    text: 'Production deployment completed! 🎉',
    attachments: [
      {
        color: 'good',
        title: 'v2.0.0 Deployment',
        text: 'All systems operational',
        fields: [
          { title: 'Environment', value: 'Production', short: true },
          { title: 'Version', value: 'v2.0.0', short: true },
          { title: 'Deploy Time', value: '2 minutes', short: true },
          { title: 'Status', value: '✅ Success', short: true },
        ],
        footer: 'WebVentures Deploy Bot',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  },
})
```

### Custom Strategy (Geographic Routing)

```typescript
import type { StrategyFunction } from '@webventures/comms'

const geographicRouting: StrategyFunction = (providers, notification) => {
  const userCountry = notification.metadata?.country

  // Route EU users to EU provider, US users to US provider
  if (userCountry === 'DE' || userCountry === 'FR') {
    return providers.find((p) => p.id === 'eu-provider')
  }

  if (userCountry === 'US') {
    return providers.find((p) => p.id === 'us-provider')
  }

  return providers[0] // Default
}

const comms = new CommsSdk({
  channels: {
    email: {
      providers: [
        { type: 'ses', id: 'us-provider', region: 'us-east-1' },
        { type: 'ses', id: 'eu-provider', region: 'eu-west-1' },
      ],
      customStrategy: geographicRouting,
    },
  },
})
```

[See more examples →](./docs/EXAMPLES.md)

---

## 🛡️ Error Handling

### Response Status Checking

```typescript
const result = await comms.send({
  /* ... */
})

if (result.status === 'success') {
  console.log('✓ Notification sent:', result.channels.email?.id)
} else {
  console.error('✗ Notification failed:', result.errors)
  result.errors?.forEach((error) => {
    console.error(`${error.channel}: ${error.message}`)
  })
}
```

### Using Type Guards

```typescript
import { isSuccessResponse, isErrorResponse, getErrors, isCommsError } from '@webventures/comms'

const result = await comms.send({
  /* ... */
})

if (isSuccessResponse(result)) {
  console.log('Success!', result.channels)
}

if (isErrorResponse(result)) {
  const errors = getErrors(result)
  errors.forEach((err) => console.error(err.message))
}
```

### Try-Catch Pattern

```typescript
import { CommsError, ProviderError } from '@webventures/comms'

try {
  await comms.send({
    /* ... */
  })
} catch (error) {
  if (error instanceof ProviderError) {
    console.error(`Provider ${error.providerId} failed on ${error.channel}:`, error.message)
    // Implement fallback logic or alerting
  } else if (error instanceof CommsError) {
    console.error('SDK Error:', error.code, error.message)
  } else {
    console.error('Unexpected error:', error)
  }
}
```

---

## 🧪 Local Development & Testing

### Notification Catcher

For local development, use [Notification Catcher](https://github.com/notifme/catcher) to intercept all notifications in a web UI:

```bash
# Install
npm install --save-dev notification-catcher

# Start catcher (runs on port 1080)
npx notification-catcher
```

Configure SDK:

```typescript
const comms = new CommsSdk({
  useNotificationCatcher: true, // Sends all to http://localhost:1080
  channels: {
    email: { providers: [{ type: 'logger' }] }, // Optional: also log to console
  },
})

await comms.send({
  email: {
    from: 'test@example.com',
    to: 'user@example.com',
    subject: 'Test Email',
    html: '<h1>Testing</h1>',
  },
})
```

Open [http://localhost:1080](http://localhost:1080) to view all sent notifications with full headers, content, and metadata.

### Environment-Based Configuration

```typescript
const isDev = process.env.NODE_ENV === 'development'
const isProd = process.env.NODE_ENV === 'production'

const comms = new CommsSdk({
  useNotificationCatcher: isDev,
  channels: {
    email: {
      providers: isProd
        ? [
            { type: 'sendgrid', apiKey: process.env.SENDGRID_API_KEY! },
            { type: 'ses', region: 'us-east-1', accessKeyId: '...', secretAccessKey: '...' },
          ]
        : [{ type: 'logger' }],
    },
  },
})
```

---

## 📦 TypeScript Support

WebVentures Comms SDK is built with TypeScript and provides comprehensive type definitions:

### Import Types

```typescript
import CommsSdk, {
  // Configuration Types
  CommsSdkConfig,
  ChannelConfig,
  ProviderConfig,

  // Request Types
  NotificationRequest,
  EmailRequest,
  SmsRequest,
  PushRequest,
  VoiceRequest,
  WebpushRequest,
  SlackRequest,
  WhatsappRequest,

  // Response Types
  NotificationStatus,
  ChannelStatus,

  // Error Types
  CommsError,
  ProviderError,
  ConfigurationError,
  ValidationError,
  NetworkError,

  // Provider Types
  EmailProvider,
  SmsProvider,
  PushProvider,

  // Strategy Types
  StrategyFunction,
  MultiProviderStrategyType,

  // Utility Functions
  isSuccessResponse,
  isErrorResponse,
  getErrors,
  isCommsError,
} from '@webventures/comms'
```

### Type-Safe Configuration

```typescript
const config: CommsSdkConfig = {
  channels: {
    email: {
      multiProviderStrategy: 'fallback',
      providers: [
        {
          type: 'sendgrid',
          apiKey: 'your-key',
        }, // TypeScript validates provider config
      ],
    },
  },
}

const comms = new CommsSdk(config)
```

### Type-Safe Requests

```typescript
const emailRequest: EmailRequest = {
  from: 'noreply@example.com',
  to: 'user@example.com',
  subject: 'Hello',
  html: '<h1>World</h1>',
  attachments: [
    {
      filename: 'doc.pdf',
      content: buffer,
      contentType: 'application/pdf',
    },
  ],
}

const request: NotificationRequest = {
  email: emailRequest,
  // TypeScript ensures correct structure
}

const result: NotificationStatus = await comms.send(request)
// TypeScript knows result.channels, result.status, result.errors
```

---

## ⚙️ Supported Providers

### Email Providers (7)

| Provider      | Type        | Features                           |
| ------------- | ----------- | ---------------------------------- |
| **SMTP**      | `smtp`      | Any SMTP server, OAuth 2.0 support |
| **SendGrid**  | `sendgrid`  | API v3, templates, tracking        |
| **AWS SES**   | `ses`       | High volume, cost-effective        |
| **Mailgun**   | `mailgun`   | EU/US regions, validation API      |
| **Mandrill**  | `mandrill`  | MailChimp integration, templates   |
| **SparkPost** | `sparkpost` | Analytics, A/B testing             |
| **Sendmail**  | `sendmail`  | Local sendmail binary              |

### SMS Providers (9)

| Provider           | Type         | Countries             |
| ------------------ | ------------ | --------------------- |
| **Twilio**         | `twilio`     | 180+ countries        |
| **Vonage (Nexmo)** | `nexmo`      | Global coverage       |
| **Plivo**          | `plivo`      | 190+ countries        |
| **Infobip**        | `infobip`    | Global, enterprise    |
| **OVH**            | `ovh`        | Europe focus          |
| **Callr**          | `callr`      | Europe, North America |
| **Clickatell**     | `clickatell` | Global coverage       |
| **46elks**         | `46elks`     | Sweden focus          |
| **Seven**          | `seven`      | Europe, APAC          |

### Push Notification Providers (4)

| Provider | Type  | Platform                       |
| -------- | ----- | ------------------------------ |
| **APNs** | `apn` | iOS (Token & Certificate auth) |
| **FCM**  | `fcm` | Android, iOS, Web              |
| **WNS**  | `wns` | Windows                        |
| **ADM**  | `adm` | Amazon Fire devices            |

### Other Providers

- **Voice**: Twilio (TwiML support)
- **Webpush**: Web Push with VAPID
- **Slack**: Webhook with rich formatting
- **WhatsApp**: Infobip Business API

[See provider configuration guide →](./docs/PROVIDERS.md)

---

## 🏗️ Architecture

WebVentures Comms SDK follows enterprise-grade design patterns:

- **Factory Pattern** - Provider and strategy instantiation
- **Strategy Pattern** - Multi-provider selection algorithms
- **Facade Pattern** - Simplified API over complex provider logic
- **Registry Pattern** - Provider instance management
- **Adapter Pattern** - Framework-specific optimizations

[See architecture documentation →](./docs/ARCHITECTURE.md)

---

## 🚀 Performance & Best Practices

### ✅ Reuse SDK Instances

```typescript
// ✓ Good - Reuse instance (connection pooling, caching)
const comms = new CommsSdk({
  /* config */
})

export async function sendEmail(to: string, subject: string) {
  return await comms.send({ email: { from: 'noreply@example.com', to, subject, text: '...' } })
}

// ✗ Bad - Creating new instance per call (expensive)
export async function sendEmail(to: string, subject: string) {
  const comms = new CommsSdk({
    /* config */
  }) // Don't do this!
  return await comms.send({
    /* ... */
  })
}
```

### ✅ Use Environment Variables

```typescript
import { createNodeCommsFromEnv } from '@webventures/comms/adapters'

// Reads COMMS_EMAIL_PROVIDER, COMMS_SMS_PROVIDER, etc.
const comms = createNodeCommsFromEnv()
```

### ✅ Configure Logging

```typescript
import winston from 'winston'

const comms = new CommsSdk({
  /* ... */
})

// Mute logs in production
if (process.env.NODE_ENV === 'production') {
  comms.logger.mute()
}

// Custom logging
comms.logger.configure([
  new winston.transports.File({ filename: 'notifications.log', level: 'error' }),
  new winston.transports.Console({ level: 'info' }),
])
```

### ✅ Handle Errors Gracefully

```typescript
const result = await comms.send({
  /* ... */
})

if (result.status === 'error') {
  // Log for monitoring
  logger.error('Notification failed', { errors: result.errors })

  // Alert dev team for critical notifications
  if (isCritical) {
    await alertOps(result.errors)
  }

  // Retry or queue for later
  await retryQueue.add(notification, { attempts: 3 })
}
```

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone repository
git clone https://github.com/CryptVenture/Comms.git
cd comms

# Install dependencies
pnpm install

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Type check
pnpm type-check

# Build
pnpm build

# Lint & format
pnpm lint:fix
```

### Running Tests

```bash
# All tests
pnpm test

# Coverage report
pnpm test:coverage

# UI mode
pnpm test:ui
```

---

## 📊 Stats

- **138 Tests** - 100% passing
- **40+ Providers** - Production-ready integrations
- **7 Channels** - Email, SMS, Push, Voice, Webpush, Slack, WhatsApp
- **Zero Dependencies** (runtime) - Minimal footprint
- **TypeScript 100%** - Full type safety
- **Node.js 18+** - Modern JavaScript features

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

---

## 🆘 Support & Community

- **[GitHub Issues](https://github.com/CryptVenture/Comms/issues)** - Report bugs and request features
- **[GitHub Discussions](https://github.com/CryptVenture/Comms/discussions)** - Ask questions and share ideas
- **[npm Package](https://www.npmjs.com/package/@webventures/comms)** - View on npm registry
- **[Documentation](./docs/README.md)** - Complete guides and API reference

---

## 🔗 Related Projects

- **[Notification Catcher](https://github.com/notifme/catcher)** - Local notification testing tool
- **[WebVentures Platform](https://webventures.co)** - Complete communication platform (coming soon)

---

<div align="center">

**Built with ❤️ by the WebVentures team**

[Website](https://webventures.co) • [GitHub](https://github.com/CryptVenture/Comms) • [npm](https://www.npmjs.com/package/@webventures/comms)

</div>
