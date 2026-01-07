# Framework Integration Guide

Complete guides for integrating WebVentures Comms SDK v2.0.5 with popular frameworks.

## Table of Contents

- [Next.js 16+](#nextjs-16)
- [React 19](#react-19)
- [React Native](#react-native)
- [Expo](#expo)
- [Node.js](#nodejs)
- [Best Practices](#best-practices)

---

## Next.js 16+

WebVentures Comms SDK provides first-class support for Next.js 16+ with dedicated adapters for Server Components, Server Actions, and API Routes.

### Installation

```bash
npm install @webventures/comms
```

### Server Actions (Recommended)

Server Actions are the recommended way to send notifications in Next.js 16+.

```typescript
// app/actions/notifications.ts
'use server'

import { createNextJSComms } from '@webventures/comms/adapters'

export async function sendWelcomeEmail(email: string) {
  const comms = createNextJSComms({
    channels: {
      email: {
        providers: [
          {
            type: 'sendgrid',
            apiKey: process.env.SENDGRID_API_KEY!,
          },
        ],
      },
    },
  })

  return await comms.send({
    email: {
      from: 'noreply@example.com',
      to: email,
      subject: 'Welcome to Our Platform!',
      html: '<h1>Welcome!</h1><p>Thanks for signing up.</p>',
    },
  })
}
```

Using the Server Action in a Client Component:

```typescript
// app/components/SignupForm.tsx
'use client'

import { sendWelcomeEmail } from '@/app/actions/notifications'

export function SignupForm() {
  const handleSubmit = async (formData: FormData) => {
    const email = formData.get('email') as string
    const result = await sendWelcomeEmail(email)

    if (result.status === 'success') {
      console.log('Email sent successfully!')
    }
  }

  return (
    <form action={handleSubmit}>
      <input type="email" name="email" required />
      <button type="submit">Sign Up</button>
    </form>
  )
}
```

### Server Components

Use WebVentures Comms SDK directly in Server Components:

```typescript
// app/dashboard/page.tsx
import { createNextJSComms } from '@webventures/comms/adapters'

async function sendDailyReport(userId: string) {
  const comms = createNextJSComms({
    channels: {
      email: {
        providers: [{ type: 'ses', region: 'us-east-1', accessKeyId: '...', secretAccessKey: '...' }]
      }
    }
  })

  return await comms.send({
    email: {
      from: 'reports@example.com',
      to: 'user@example.com',
      subject: 'Daily Report',
      html: '<h1>Your Daily Report</h1>'
    }
  })
}

export default async function DashboardPage() {
  // Send report in server component
  const result = await sendDailyReport('user-123')

  return (
    <div>
      <h1>Dashboard</h1>
      {result.status === 'success' && <p>Report sent!</p>}
    </div>
  )
}
```

### API Routes

Use in App Router API routes:

```typescript
// app/api/notifications/send/route.ts
import { createNextJSComms } from '@webventures/comms/adapters'
import { NextRequest, NextResponse } from 'next/server'

const comms = createNextJSComms({
  channels: {
    email: {
      providers: [{ type: 'sendgrid', apiKey: process.env.SENDGRID_API_KEY! }],
    },
    sms: {
      providers: [
        {
          type: 'twilio',
          accountSid: process.env.TWILIO_SID!,
          authToken: process.env.TWILIO_TOKEN!,
        },
      ],
    },
  },
})

export async function POST(request: NextRequest) {
  const { channel, ...data } = await request.json()

  try {
    const result = await comms.send({
      [channel]: data,
    })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
  }
}
```

### Reusable Server Action Wrapper

Use `withComms` for better performance with reusable instances:

```typescript
// app/actions/notifications.ts
'use server'

import { withComms } from '@webventures/comms/adapters'

export const sendEmail = withComms(
  async (comms, email: string, subject: string, body: string) => {
    return await comms.send({
      email: {
        from: 'noreply@example.com',
        to: email,
        subject,
        html: body,
      },
    })
  },
  {
    channels: {
      email: {
        providers: [{ type: 'sendgrid', apiKey: process.env.SENDGRID_API_KEY! }],
      },
    },
  }
)

// Usage in component
await sendEmail('user@example.com', 'Hello', '<h1>Hello!</h1>')
```

### Environment Configuration

```bash
# .env.local
SENDGRID_API_KEY=your_sendgrid_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret

# Development
NODE_ENV=development
USE_NOTIFICATION_CATCHER=true
```

### Edge Runtime Support

WebVentures Comms SDK supports Next.js Edge Runtime with compatible providers:

```typescript
// app/api/send-email/route.ts
import { createNextJSComms } from '@webventures/comms/adapters'

export const runtime = 'edge'

const comms = createNextJSComms({
  channels: {
    email: {
      providers: [{ type: 'sendgrid', apiKey: process.env.SENDGRID_API_KEY! }],
    },
  },
})

export async function POST(request: Request) {
  const data = await request.json()
  const result = await comms.send({ email: data })
  return Response.json(result)
}
```

### Best Practices for Next.js

1. **Use Server Actions**: Prefer Server Actions over API Routes for better DX
2. **Singleton Pattern**: Create one SDK instance per channel configuration
3. **Environment Variables**: Store all API keys in environment variables
4. **Error Boundaries**: Wrap notification calls in try-catch blocks
5. **Loading States**: Show loading indicators while notifications send

**Example with Error Handling:**

```typescript
'use server'

import { createNextJSComms, isProviderError } from '@webventures/comms/adapters'

export async function sendNotification(email: string) {
  try {
    const comms = createNextJSComms({...})
    const result = await comms.send({...})

    if (result.status === 'error') {
      console.error('Notification errors:', result.errors)
      return { success: false, errors: result.errors }
    }

    return { success: true, messageId: result.channels?.email?.id }
  } catch (error) {
    if (isProviderError(error)) {
      console.error(`Provider ${error.providerId} failed:`, error.message)
    }
    throw error
  }
}
```

---

## React 19

For React 19 applications, WebVentures Comms SDK should be used server-side. The SDK provides a helper for calling backend APIs from client components.

### With Next.js

See [Next.js section](#nextjs-16) above for complete integration with React 19 + Next.js.

### With Separate Backend

For React 19 apps with a separate backend API:

```typescript
// Frontend: src/hooks/useNotifications.ts
import { useCommsBackend } from '@webventures/comms/adapters'

export function useNotifications() {
  const backend = useCommsBackend(process.env.REACT_APP_API_URL!)

  const sendEmail = async (to: string, subject: string, body: string) => {
    return await backend.send({
      email: {
        from: 'noreply@example.com',
        to,
        subject,
        html: body
      }
    })
  }

  return { sendEmail }
}

// Usage in component
function MyComponent() {
  const { sendEmail } = useNotifications()

  const handleSend = async () => {
    await sendEmail('user@example.com', 'Hello', '<h1>Hi!</h1>')
  }

  return <button onClick={handleSend}>Send Email</button>
}
```

```typescript
// Backend: server/routes/notifications.ts
import CommsSdk from '@webventures/comms'
import express from 'express'

const comms = new CommsSdk({
  channels: {
    email: {
      providers: [{ type: 'sendgrid', apiKey: process.env.SENDGRID_API_KEY! }],
    },
  },
})

const router = express.Router()

router.post('/notifications/send', async (req, res) => {
  try {
    const result = await comms.send(req.body)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: 'Failed to send notification' })
  }
})

export default router
```

### Custom Hook with State Management

```typescript
import { useState } from 'react'
import { useCommsBackend } from '@webventures/comms/adapters'

export function useNotification() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const backend = useCommsBackend(process.env.REACT_APP_API_URL!)

  const send = async (notification: any) => {
    setLoading(true)
    setError(null)

    try {
      const result = await backend.send(notification)
      return result
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { send, loading, error }
}
```

---

## React Native

**Important**: Most notification providers require server-side API keys and should NOT be used directly from React Native apps. Instead, create a backend API that uses WebVentures Comms SDK.

### Backend API Client

```typescript
// src/services/notifications.ts
import { createCommsBackendClient } from '@webventures/comms/adapters'

export const commsClient = createCommsBackendClient('https://api.example.com')

export async function sendWelcomeEmail(email: string) {
  return await commsClient.send({
    email: {
      from: 'noreply@example.com',
      to: email,
      subject: 'Welcome!',
      text: 'Thanks for signing up!',
    },
  })
}
```

### Usage in React Native Component

```typescript
// src/screens/SignupScreen.tsx
import React, { useState } from 'react'
import { View, TextInput, Button, Alert } from 'react-native'
import { sendWelcomeEmail } from '../services/notifications'

export function SignupScreen() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async () => {
    setLoading(true)
    try {
      const result = await sendWelcomeEmail(email)
      if (result.status === 'success') {
        Alert.alert('Success', 'Welcome email sent!')
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        keyboardType="email-address"
      />
      <Button
        title="Sign Up"
        onPress={handleSignup}
        disabled={loading}
      />
    </View>
  )
}
```

### Platform-Specific Configuration

```typescript
import { getReactNativePlatform } from '@webventures/comms/adapters'

const platform = getReactNativePlatform() // 'ios' | 'android' | 'unknown'

// Customize notifications based on platform
const notification = {
  push: {
    registrationToken: deviceToken,
    title: 'New Message',
    body: 'You have a new message',
    // iOS-specific
    ...(platform === 'ios' && {
      badge: 1,
      sound: 'default',
    }),
    // Android-specific
    ...(platform === 'android' && {
      icon: 'notification_icon',
      color: '#FF0000',
    }),
  },
}
```

### Backend Setup for React Native

```typescript
// backend/server.ts
import express from 'express'
import CommsSdk from '@webventures/comms'

const app = express()
app.use(express.json())

const comms = new CommsSdk({
  channels: {
    email: {
      providers: [{ type: 'sendgrid', apiKey: process.env.SENDGRID_API_KEY! }],
    },
    push: {
      providers: [
        {
          type: 'fcm',
          id: process.env.FCM_SERVER_KEY!,
        },
      ],
    },
  },
})

app.post('/notifications/send', async (req, res) => {
  try {
    const result = await comms.send(req.body)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: 'Failed to send notification' })
  }
})

app.listen(3000)
```

---

## Expo

Expo integration is similar to React Native, with additional Expo-specific helpers.

### Backend Client Setup

```typescript
// src/services/notifications.ts
import { createExpoBackendClient, isExpo, getExpoInfo } from '@webventures/comms/adapters'

export const commsClient = createExpoBackendClient('https://api.example.com')

// Check Expo environment
const expoInfo = getExpoInfo()
console.log('Is Expo:', expoInfo.isExpo)
console.log('Platform:', expoInfo.platform) // 'ios' | 'android' | 'web'
console.log('Is Dev:', expoInfo.isExpoDev)

export async function sendNotification(data: any) {
  return await commsClient.send(data)
}
```

### Expo Push Notifications

For Expo push notifications, use Expo's push notification service with your backend:

```typescript
// Backend: Expo Push Notifications
import CommsSdk from '@webventures/comms'
import { Expo } from 'expo-server-sdk'

const comms = new CommsSdk({
  channels: {
    push: {
      providers: [
        {
          type: 'custom',
          id: 'expo-push',
          send: async (request) => {
            const expo = new Expo()
            const messages = [
              {
                to: request.registrationToken,
                sound: 'default',
                title: request.title,
                body: request.body,
                data: request.custom,
              },
            ]

            const chunks = expo.chunkPushNotifications(messages)
            const tickets = await Promise.all(
              chunks.map((chunk) => expo.sendPushNotificationsAsync(chunk))
            )

            return tickets[0]?.[0]?.id ?? 'unknown'
          },
        },
      ],
    },
  },
})
```

### Usage in Expo App

```typescript
// App.tsx
import React from 'react'
import { View, Button } from 'react-native'
import { sendNotification } from './services/notifications'
import * as Notifications from 'expo-notifications'

export default function App() {
  const handleSendPush = async () => {
    // Get Expo Push Token
    const token = (await Notifications.getExpoPushTokenAsync()).data

    // Send via backend
    await sendNotification({
      push: {
        registrationToken: token,
        title: 'Hello',
        body: 'This is a test notification'
      }
    })
  }

  return (
    <View>
      <Button title="Send Push" onPress={handleSendPush} />
    </View>
  )
}
```

---

## Node.js

Standard Node.js integration for backend applications, APIs, and CLI tools.

### Basic Setup

```typescript
// server.ts
import CommsSdk from '@webventures/comms'

const comms = new CommsSdk({
  channels: {
    email: {
      multiProviderStrategy: 'fallback',
      providers: [
        { type: 'sendgrid', apiKey: process.env.SENDGRID_API_KEY! },
        { type: 'ses', region: 'us-east-1', accessKeyId: '...', secretAccessKey: '...' },
      ],
    },
    sms: {
      providers: [{ type: 'twilio', accountSid: '...', authToken: '...' }],
    },
  },
})

// Send notification
async function sendWelcomeNotification(user: User) {
  return await comms.send({
    email: {
      from: 'noreply@example.com',
      to: user.email,
      subject: 'Welcome!',
      html: '<h1>Welcome to our platform!</h1>',
    },
    sms: {
      from: '+1234567890',
      to: user.phone,
      text: 'Welcome to our platform!',
    },
  })
}
```

### Environment-Based Configuration

```typescript
// config/comms.ts
import { createNodeCommsFromEnv } from '@webventures/comms/adapters'

export const comms = createNodeCommsFromEnv()
```

```bash
# .env
COMMS_EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_key

COMMS_SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token

NODE_ENV=development
USE_NOTIFICATION_CATCHER=true
```

### Singleton Pattern

```typescript
// services/comms.ts
import { getCommsSingleton, resetCommsSingleton } from '@webventures/comms/adapters'

export const getComms = () => {
  return getCommsSingleton({
    channels: {
      email: {
        providers: [{ type: 'sendgrid', apiKey: process.env.SENDGRID_API_KEY! }]
      }
    }
  })
}

// For testing
export const resetComms = resetCommsSingleton

// Usage
import { getComms } from './services/comms'

const comms = getComms()
await comms.send({...})
```

### Express.js Integration

```typescript
// server.ts
import express from 'express'
import CommsSdk from '@webventures/comms'

const app = express()
app.use(express.json())

const comms = new CommsSdk({
  channels: {
    email: { providers: [{ type: 'sendgrid', apiKey: process.env.SENDGRID_API_KEY! }] },
    sms: { providers: [{ type: 'twilio', accountSid: '...', authToken: '...' }] },
  },
})

app.post('/api/send-email', async (req, res) => {
  try {
    const { to, subject, body } = req.body
    const result = await comms.send({
      email: {
        from: 'noreply@example.com',
        to,
        subject,
        html: body,
      },
    })

    if (result.status === 'success') {
      res.json({ success: true, messageId: result.channels?.email?.id })
    } else {
      res.status(500).json({ success: false, errors: result.errors })
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

app.listen(3000, () => {
  console.log('Server running on port 3000')
})
```

### CLI Application

```typescript
#!/usr/bin/env node
// bin/send-notification.ts
import CommsSdk from '@webventures/comms'
import { Command } from 'commander'

const program = new Command()

program
  .name('send-notification')
  .description('Send notifications via CLI')
  .version('1.0.0')

program
  .command('email')
  .description('Send email')
  .requiredOption('-t, --to <email>', 'Recipient email')
  .requiredOption('-s, --subject <subject>', 'Email subject')
  .requiredOption('-b, --body <body>', 'Email body')
  .action(async (options) => {
    const comms = new CommsSdk({
      channels: {
        email: {
          providers: [{ type: 'smtp', host: '...', port: 587, auth: {...} }]
        }
      }
    })

    const result = await comms.send({
      email: {
        from: 'cli@example.com',
        to: options.to,
        subject: options.subject,
        html: options.body
      }
    })

    console.log('Result:', result)
  })

program.parse()
```

### Queue Integration (Bull)

```typescript
// workers/notification-worker.ts
import Queue from 'bull'
import CommsSdk from '@webventures/comms'

const comms = new CommsSdk({...})

const notificationQueue = new Queue('notifications', {
  redis: { host: 'localhost', port: 6379 }
})

notificationQueue.process(async (job) => {
  const { channel, data } = job.data

  const result = await comms.send({
    [channel]: data
  })

  return result
})

// Add job to queue
export async function queueNotification(channel: string, data: any) {
  return await notificationQueue.add({ channel, data }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  })
}
```

---

## Best Practices

### Security

1. **Never expose API keys in client-side code**
   - Always use server-side APIs
   - Store keys in environment variables
   - Use secrets management services (AWS Secrets Manager, HashiCorp Vault)

2. **Validate inputs**

   ```typescript
   function validateEmail(email: string): boolean {
     return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
   }

   if (!validateEmail(to)) {
     throw new Error('Invalid email address')
   }
   ```

3. **Rate limiting**

   ```typescript
   import rateLimit from 'express-rate-limit'

   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100, // limit each IP to 100 requests per windowMs
   })

   app.use('/api/send-notification', limiter)
   ```

### Performance

1. **Singleton instances**: Create one SDK instance per configuration
2. **Connection pooling**: Enable for SMTP providers
3. **Async operations**: Always use async/await
4. **Queue heavy loads**: Use job queues (Bull, BullMQ) for bulk sending

### Error Handling

1. **Always check response status**

   ```typescript
   const result = await comms.send({...})
   if (result.status === 'error') {
     // Handle errors per channel
     console.error(result.errors)
   }
   ```

2. **Use try-catch for exceptions**

   ```typescript
   try {
     await comms.send({...})
   } catch (error) {
     if (isProviderError(error)) {
       // Provider-specific handling
     }
   }
   ```

3. **Implement retry logic**
   ```typescript
   async function sendWithRetry(notification, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       const result = await comms.send(notification)
       if (result.status === 'success') return result
       if (i < maxRetries - 1) await sleep(1000 * Math.pow(2, i))
     }
     throw new Error('Max retries exceeded')
   }
   ```

### Testing

1. **Use Notification Catcher in development**

   ```typescript
   const comms = new CommsSdk({
     useNotificationCatcher: process.env.NODE_ENV === 'development',
   })
   ```

2. **Mock in tests**

   ```typescript
   import { vi } from 'vitest'

   vi.mock('@webventures/comms', () => ({
     default: vi.fn().mockImplementation(() => ({
       send: vi.fn().mockResolvedValue({
         status: 'success',
         channels: { email: { id: 'test-id', providerId: 'test' } },
       }),
     })),
   }))
   ```

---

## See Also

- [Main Documentation](./README.md)
- [API Reference](./API.md)
- [Provider Configuration](./PROVIDERS.md)
- [Examples](./EXAMPLES.md)
