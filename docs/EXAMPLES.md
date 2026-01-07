# Comprehensive Examples

Complete code examples for WebVentures Comms SDK v2.0.5 covering all features and use cases.

## Table of Contents

- [Basic Examples](#basic-examples)
- [Email Examples](#email-examples)
- [SMS Examples](#sms-examples)
- [Push Notification Examples](#push-notification-examples)
- [Telegram Examples](#telegram-examples)
- [Multi-Channel Examples](#multi-channel-examples)
- [Provider Strategy Examples](#provider-strategy-examples)
- [Error Handling Examples](#error-handling-examples)
- [Testing Examples](#testing-examples)
- [Production Examples](#production-examples)
- [Advanced Examples](#advanced-examples)

---

## Basic Examples

### Simple Email Send

```typescript
import CommsSdk from '@webventures/comms'

const comms = new CommsSdk({
  channels: {
    email: {
      providers: [
        {
          type: 'smtp',
          host: 'smtp.gmail.com',
          port: 587,
          auth: {
            user: process.env.EMAIL_USER!,
            pass: process.env.EMAIL_PASS!,
          },
        },
      ],
    },
  },
})

async function sendWelcomeEmail(email: string, name: string) {
  const result = await comms.send({
    email: {
      from: 'noreply@example.com',
      to: email,
      subject: `Welcome ${name}!`,
      html: `<h1>Welcome ${name}!</h1><p>Thanks for joining us.</p>`,
    },
  })

  console.log('Email sent:', result.channels?.email?.id)
}

await sendWelcomeEmail('user@example.com', 'John')
```

### Simple SMS Send

```typescript
const comms = new CommsSdk({
  channels: {
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

async function sendVerificationCode(phone: string, code: string) {
  const result = await comms.send({
    sms: {
      from: '+1234567890',
      to: phone,
      text: `Your verification code is: ${code}`,
    },
  })

  return result.channels?.sms?.id
}

await sendVerificationCode('+0987654321', '123456')
```

---

## Email Examples

### Rich HTML Email with Attachments

```typescript
import fs from 'fs'
import CommsSdk from '@webventures/comms'

const comms = new CommsSdk({
  channels: {
    email: {
      providers: [{ type: 'sendgrid', apiKey: process.env.SENDGRID_API_KEY! }],
    },
  },
})

async function sendInvoice(customer: Customer, invoice: Invoice) {
  const pdfBuffer = await generateInvoicePDF(invoice)

  const result = await comms.send({
    email: {
      from: 'billing@example.com',
      to: customer.email,
      cc: ['accounting@example.com'],
      subject: `Invoice #${invoice.number}`,
      html: `
        <html>
          <body>
            <h1>Invoice #${invoice.number}</h1>
            <p>Dear ${customer.name},</p>
            <p>Please find your invoice attached.</p>
            <table>
              <tr><td>Amount:</td><td>$${invoice.amount}</td></tr>
              <tr><td>Due Date:</td><td>${invoice.dueDate}</td></tr>
            </table>
            <p>Thank you for your business!</p>
          </body>
        </html>
      `,
      attachments: [
        {
          contentType: 'application/pdf',
          filename: `invoice-${invoice.number}.pdf`,
          content: pdfBuffer,
        },
      ],
      headers: {
        'X-Invoice-Number': invoice.number,
        'X-Customer-ID': customer.id,
      },
    },
  })

  return result
}
```

### Email with Custom Headers and Tracking

```typescript
async function sendMarketingEmail(subscriber: Subscriber, campaign: Campaign) {
  const unsubscribeUrl = `https://example.com/unsubscribe?id=${subscriber.id}`
  const trackingPixel = `<img src="https://example.com/track/${campaign.id}/${subscriber.id}" width="1" height="1" />`

  const result = await comms.send({
    email: {
      from: 'newsletter@example.com',
      to: subscriber.email,
      subject: campaign.subject,
      html: `
        <html>
          <body>
            ${campaign.content}
            ${trackingPixel}
            <p><a href="${unsubscribeUrl}">Unsubscribe</a></p>
          </body>
        </html>
      `,
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'X-Campaign-ID': campaign.id,
        'X-Subscriber-ID': subscriber.id,
      },
    },
  })

  return result
}
```

### Bulk Email with Template

```typescript
interface EmailTemplate {
  subject: string
  html: string
}

async function sendBulkEmails(
  recipients: string[],
  template: EmailTemplate,
  variables: Record<string, string>
) {
  const promises = recipients.map((email) => {
    // Replace variables in template
    const subject = template.subject.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || '')
    const html = template.html.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || '')

    return comms.send({
      email: {
        from: 'noreply@example.com',
        to: email,
        subject,
        html,
      },
    })
  })

  const results = await Promise.allSettled(promises)

  const succeeded = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length

  return { succeeded, failed }
}

const template = {
  subject: 'Hello {{name}}!',
  html: '<h1>Welcome {{name}}!</h1><p>Your account is ready.</p>',
}

await sendBulkEmails(['user1@example.com', 'user2@example.com'], template, { name: 'John' })
```

---

## SMS Examples

### Two-Factor Authentication

```typescript
import crypto from 'crypto'

const comms = new CommsSdk({
  channels: {
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

class TwoFactorAuth {
  private codes = new Map<string, { code: string; expires: number }>()

  async sendCode(phone: string): Promise<void> {
    const code = crypto.randomInt(100000, 999999).toString()
    const expires = Date.now() + 5 * 60 * 1000 // 5 minutes

    this.codes.set(phone, { code, expires })

    await comms.send({
      sms: {
        from: '+1234567890',
        to: phone,
        text: `Your verification code is ${code}. Valid for 5 minutes.`,
        nature: 'transactional',
      },
    })
  }

  verifyCode(phone: string, code: string): boolean {
    const stored = this.codes.get(phone)
    if (!stored) return false

    if (Date.now() > stored.expires) {
      this.codes.delete(phone)
      return false
    }

    if (stored.code === code) {
      this.codes.delete(phone)
      return true
    }

    return false
  }
}

const twoFA = new TwoFactorAuth()
await twoFA.sendCode('+0987654321')
```

### SMS with Unicode Characters

```typescript
async function sendInternationalSMS(phone: string, message: string) {
  const result = await comms.send({
    sms: {
      from: '+1234567890',
      to: phone,
      text: message,
      type: 'unicode', // Enable unicode for international characters
      nature: 'transactional',
    },
  })

  return result
}

// Send in different languages
await sendInternationalSMS('+33600000000', 'Bonjour! Votre code est: 123456')
await sendInternationalSMS('+81900000000', 'こんにちは！認証コード: 123456')
await sendInternationalSMS('+34600000000', '¡Hola! Tu código es: 123456')
```

### SMS Delivery Status Tracking

```typescript
interface SmsTracker {
  messageId: string
  phone: string
  status: 'sent' | 'delivered' | 'failed'
  timestamp: number
}

const smsTracker = new Map<string, SmsTracker>()

async function sendTrackedSMS(phone: string, text: string) {
  const result = await comms.send({
    sms: {
      from: '+1234567890',
      to: phone,
      text,
    },
  })

  if (result.status === 'success' && result.channels?.sms?.id) {
    smsTracker.set(result.channels.sms.id, {
      messageId: result.channels.sms.id,
      phone,
      status: 'sent',
      timestamp: Date.now(),
    })
  }

  return result
}

// Webhook handler for delivery status
function handleDeliveryStatus(messageId: string, status: 'delivered' | 'failed') {
  const tracker = smsTracker.get(messageId)
  if (tracker) {
    tracker.status = status
    tracker.timestamp = Date.now()
  }
}
```

---

## Push Notification Examples

### iOS Push Notification

```typescript
const comms = new CommsSdk({
  channels: {
    push: {
      providers: [
        {
          type: 'apn',
          token: {
            key: process.env.APN_KEY!,
            keyId: process.env.APN_KEY_ID!,
            teamId: process.env.APN_TEAM_ID!,
          },
          production: true,
        },
      ],
    },
  },
})

async function sendIOSPush(deviceToken: string, data: NotificationData) {
  const result = await comms.send({
    push: {
      registrationToken: deviceToken,
      title: data.title,
      body: data.body,
      badge: data.unreadCount,
      sound: 'default',
      topic: 'com.example.app', // Bundle ID
      category: 'MESSAGE',
      custom: {
        messageId: data.messageId,
        senderId: data.senderId,
        chatId: data.chatId,
      },
    },
  })

  return result
}
```

### Android Push Notification

```typescript
async function sendAndroidPush(fcmToken: string, data: NotificationData) {
  const result = await comms.send({
    push: {
      registrationToken: fcmToken,
      title: data.title,
      body: data.body,
      icon: 'notification_icon',
      color: '#FF0000',
      priority: 'high',
      clickAction: 'OPEN_CHAT',
      tag: `chat-${data.chatId}`, // Replace previous notification
      custom: {
        messageId: data.messageId,
        senderId: data.senderId,
        chatId: data.chatId,
        type: 'chat_message',
      },
    },
  })

  return result
}
```

### Silent Push for Background Updates

```typescript
async function sendSilentPush(deviceToken: string, updateData: any) {
  const result = await comms.send({
    push: {
      registrationToken: deviceToken,
      title: '', // Empty for silent push
      body: '',
      contentAvailable: true, // Enable content-available
      priority: 'high',
      custom: {
        silent: true,
        updateType: 'background_sync',
        data: updateData,
      },
    },
  })

  return result
}
```

---

## Telegram Examples

### Simple Telegram Message

```typescript
const comms = new CommsSdk({
  channels: {
    telegram: {
      providers: [
        {
          type: 'telegram',
          botToken: process.env.TELEGRAM_BOT_TOKEN,
        },
      ],
    },
  },
})

async function sendTelegramMessage(chatId: string, message: string) {
  const result = await comms.send({
    telegram: {
      chatId,
      text: message,
    },
  })

  return result.channels?.telegram?.id
}

await sendTelegramMessage('123456789', 'Hello from WebVentures Comms SDK!')
```

### HTML Formatted Message

```typescript
async function sendFormattedAlert(chatId: string, alert: Alert) {
  const result = await comms.send({
    telegram: {
      chatId,
      text: `
<b>🚨 System Alert</b>

<b>Type:</b> ${alert.type}
<b>Severity:</b> <code>${alert.severity}</code>
<b>Status:</b> <i>${alert.status}</i>

<b>Details:</b>
${alert.details}

<a href="${alert.url}">View Full Report</a>
      `.trim(),
      parseMode: 'HTML',
    },
  })

  return result
}

await sendFormattedAlert('-1001234567890', {
  type: 'Security',
  severity: 'HIGH',
  status: 'Active',
  details: 'Multiple failed login attempts detected',
  url: 'https://security.example.com/alert/123',
})
```

### MarkdownV2 Formatted Message

```typescript
async function sendDeploymentNotification(chatId: string, deployment: Deployment) {
  const result = await comms.send({
    telegram: {
      chatId,
      text: `
*🚀 Deployment Complete*

*Environment:* _${deployment.env}_
*Version:* \`${deployment.version.replace('.', '\\.')}\`
*Duration:* ${deployment.duration}
*Status:* ${deployment.status === 'success' ? '✅ Success' : '❌ Failed'}

${deployment.status === 'success' ? '__All systems operational__' : '__Rollback initiated__'}

[View Deployment Logs](${deployment.logsUrl.replace('.', '\\.').replace('-', '\\-')})
      `.trim(),
      parseMode: 'MarkdownV2',
    },
  })

  return result
}

await sendDeploymentNotification('123456789', {
  env: 'Production',
  version: 'v2.0.5',
  duration: '3m 24s',
  status: 'success',
  logsUrl: 'https://logs.example.com/deploy-123',
})
```

### Silent Notification

```typescript
async function sendBackgroundNotification(chatId: string, message: string) {
  const result = await comms.send({
    telegram: {
      chatId,
      text: message,
      disableNotification: true, // Send silently without sound
    },
  })

  console.log('Silent notification sent:', result.channels?.telegram?.id)
  return result
}

// Send notifications without disturbing users
await sendBackgroundNotification('123456789', 'Background sync completed successfully')
```

### Message Without Link Preview

```typescript
async function sendNewsUpdate(chatId: string, article: Article) {
  const result = await comms.send({
    telegram: {
      chatId,
      text: `
📰 <b>Latest News</b>

<b>${article.title}</b>

${article.summary}

Read more: ${article.url}
      `.trim(),
      parseMode: 'HTML',
      disableWebPagePreview: true, // Don't show bulky link preview
    },
  })

  return result
}

await sendNewsUpdate('123456789', {
  title: 'New SDK Release',
  summary: 'WebVentures Comms SDK v2.0.5 is now available with Telegram support!',
  url: 'https://github.com/CryptVenture/Comms',
})
```

### Bot Notifications to Groups and Channels

```typescript
interface NotificationTarget {
  type: 'private' | 'group' | 'channel'
  chatId: string
  name: string
}

const targets: NotificationTarget[] = [
  { type: 'private', chatId: '123456789', name: 'John Doe' },
  { type: 'group', chatId: '-987654321', name: 'Engineering Team' },
  { type: 'channel', chatId: '-1001234567890', name: 'Status Updates' },
]

async function broadcastNotification(message: string, targets: NotificationTarget[]) {
  const promises = targets.map((target) =>
    comms.send({
      telegram: {
        chatId: target.chatId,
        text: `
<b>📢 Broadcast Message</b>

${message}

<i>Sent to ${target.type}: ${target.name}</i>
        `.trim(),
        parseMode: 'HTML',
        // Silent for channels, normal for private/group
        disableNotification: target.type === 'channel',
      },
    })
  )

  const results = await Promise.allSettled(promises)

  const succeeded = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length

  console.log(`Broadcast complete: ${succeeded} succeeded, ${failed} failed`)

  return { succeeded, failed, results }
}

await broadcastNotification('System maintenance scheduled for tonight at 2 AM UTC', targets)
```

### Error Monitoring with Telegram

```typescript
interface ErrorDetails {
  service: string
  error: string
  stack?: string
  timestamp: Date
  severity: 'low' | 'medium' | 'high' | 'critical'
}

async function sendErrorAlert(chatId: string, error: ErrorDetails) {
  const severityEmoji = {
    low: '🟢',
    medium: '🟡',
    high: '🟠',
    critical: '🔴',
  }

  const result = await comms.send({
    telegram: {
      chatId,
      text: `
${severityEmoji[error.severity]} <b>Error Alert - ${error.severity.toUpperCase()}</b>

<b>Service:</b> <code>${error.service}</code>
<b>Time:</b> ${error.timestamp.toISOString()}

<b>Error:</b>
<pre>${error.error}</pre>

${error.stack ? `<b>Stack Trace:</b>\n<pre>${error.stack.substring(0, 500)}</pre>` : ''}
      `.trim(),
      parseMode: 'HTML',
      // Critical errors should alert immediately
      disableNotification: error.severity === 'low',
    },
  })

  return result
}

// Usage in error handler
try {
  await criticalOperation()
} catch (error) {
  await sendErrorAlert('-1001234567890', {
    service: 'PaymentProcessor',
    error: error.message,
    stack: error.stack,
    timestamp: new Date(),
    severity: 'critical',
  })
}
```

### Multi-Language Notifications

```typescript
async function sendLocalizedMessage(
  chatId: string,
  userId: string,
  messageKey: string
) {
  const user = await getUserProfile(userId)
  const language = user.language || 'en'

  const messages: Record<string, Record<string, string>> = {
    en: {
      welcome: 'Welcome to our platform! 🎉',
      reminder: 'You have a pending task',
    },
    es: {
      welcome: '¡Bienvenido a nuestra plataforma! 🎉',
      reminder: 'Tienes una tarea pendiente',
    },
    fr: {
      welcome: 'Bienvenue sur notre plateforme ! 🎉',
      reminder: 'Vous avez une tâche en attente',
    },
    de: {
      welcome: 'Willkommen auf unserer Plattform! 🎉',
      reminder: 'Sie haben eine ausstehende Aufgabe',
    },
  }

  const text = messages[language]?.[messageKey] || messages.en[messageKey]

  return await comms.send({
    telegram: {
      chatId,
      text,
    },
  })
}

await sendLocalizedMessage('123456789', 'user-456', 'welcome')
```

---

## Multi-Channel Examples

### Send Notification to All Channels

```typescript
const comms = new CommsSdk({
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
    push: {
      providers: [{ type: 'fcm', id: process.env.FCM_SERVER_KEY! }],
    },
    slack: {
      providers: [{ type: 'webhook', webhookUrl: process.env.SLACK_WEBHOOK! }],
    },
  },
})

async function sendCriticalAlert(user: User, alert: Alert) {
  const result = await comms.send({
    email: {
      from: 'alerts@example.com',
      to: user.email,
      subject: `Critical Alert: ${alert.title}`,
      html: `<h1>${alert.title}</h1><p>${alert.message}</p>`,
    },
    sms: {
      from: '+1234567890',
      to: user.phone,
      text: `ALERT: ${alert.title} - ${alert.message}`,
    },
    push: {
      registrationToken: user.deviceToken,
      title: alert.title,
      body: alert.message,
      priority: 'high',
      sound: 'alarm',
    },
    slack: {
      text: `:warning: Critical Alert`,
      attachments: [
        {
          color: 'danger',
          title: alert.title,
          text: alert.message,
          footer: `User: ${user.name}`,
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    },
  })

  // Check which channels succeeded
  const succeeded = []
  if (result.channels?.email) succeeded.push('email')
  if (result.channels?.sms) succeeded.push('sms')
  if (result.channels?.push) succeeded.push('push')
  if (result.channels?.slack) succeeded.push('slack')

  console.log(`Alert sent via: ${succeeded.join(', ')}`)
  return result
}
```

### Progressive Notification Delivery

```typescript
async function sendProgressiveNotification(user: User, message: string) {
  // 1. Try push first (fastest)
  if (user.deviceToken) {
    const pushResult = await comms.send({
      push: {
        registrationToken: user.deviceToken,
        title: 'New Message',
        body: message,
      },
    })

    if (pushResult.status === 'success') {
      return { channel: 'push', result: pushResult }
    }
  }

  // 2. Fallback to SMS
  if (user.phone) {
    const smsResult = await comms.send({
      sms: {
        from: '+1234567890',
        to: user.phone,
        text: message,
      },
    })

    if (smsResult.status === 'success') {
      return { channel: 'sms', result: smsResult }
    }
  }

  // 3. Final fallback to email
  const emailResult = await comms.send({
    email: {
      from: 'noreply@example.com',
      to: user.email,
      subject: 'New Message',
      text: message,
    },
  })

  return { channel: 'email', result: emailResult }
}
```

---

## Provider Strategy Examples

### Fallback Strategy Example

```typescript
const comms = new CommsSdk({
  channels: {
    email: {
      multiProviderStrategy: 'fallback',
      providers: [
        { type: 'sendgrid', apiKey: process.env.SENDGRID_API_KEY! },
        {
          type: 'ses',
          region: 'us-east-1',
          accessKeyId: process.env.AWS_KEY!,
          secretAccessKey: process.env.AWS_SECRET!,
        },
        { type: 'smtp', host: 'smtp.backup.com', port: 587, auth: { user: '...', pass: '...' } },
      ],
    },
  },
})

// If SendGrid fails, tries SES, then SMTP
const result = await comms.send({
  email: {
    from: 'noreply@example.com',
    to: 'user@example.com',
    subject: 'Important Email',
    text: 'This email will be delivered even if primary provider fails',
  },
})
```

### Round-Robin Strategy Example

```typescript
const comms = new CommsSdk({
  channels: {
    sms: {
      multiProviderStrategy: 'roundrobin',
      providers: [
        { type: 'twilio', accountSid: '...', authToken: '...' },
        { type: 'nexmo', apiKey: '...', apiSecret: '...' },
        { type: 'plivo', authId: '...', authToken: '...' },
      ],
    },
  },
})

// Distributes load across providers
for (let i = 0; i < 100; i++) {
  await comms.send({
    sms: {
      from: '+1234567890',
      to: `+098765432${i.toString().padStart(2, '0')}`,
      text: `Message ${i}`,
    },
  })
  // Cycles through: Twilio → Nexmo → Plivo → Twilio → ...
}
```

### Custom Strategy: Cost Optimization

```typescript
import type { StrategyFunction, Provider } from '@webventures/comms'

interface ProviderWithCost extends Provider {
  costPerMessage: number
}

const costOptimizedStrategy: StrategyFunction = (providers: Provider[]) => {
  const sortedProviders = [...providers].sort((a, b) => {
    const costA = (a as ProviderWithCost).costPerMessage || 0
    const costB = (b as ProviderWithCost).costPerMessage || 0
    return costA - costB
  })

  return async (request) => {
    for (const provider of sortedProviders) {
      try {
        const id = await provider.send(request)
        return { id, providerId: provider.id }
      } catch (error) {
        // Try next provider
        continue
      }
    }
    throw new Error('All providers failed')
  }
}

const comms = new CommsSdk({
  channels: {
    sms: {
      multiProviderStrategy: costOptimizedStrategy,
      providers: [
        { type: 'twilio', accountSid: '...', authToken: '...', costPerMessage: 0.0075 } as any,
        { type: 'nexmo', apiKey: '...', apiSecret: '...', costPerMessage: 0.005 } as any,
        { type: 'plivo', authId: '...', authToken: '...', costPerMessage: 0.006 } as any,
      ],
    },
  },
})
```

### Custom Strategy: Geographic Routing

```typescript
import type { StrategyFunction } from '@webventures/comms'
import type { SmsRequest } from '@webventures/comms'

const geographicRoutingStrategy: StrategyFunction<SmsRequest> = (providers) => {
  return async (request: SmsRequest) => {
    const countryCode = request.to.substring(0, 3)

    // Route to provider based on country
    const providerMap: Record<string, string> = {
      '+1': 'twilio-us',
      '+44': 'nexmo-uk',
      '+33': 'ovh-fr',
      '+49': 'seven-de',
    }

    const preferredProviderId = providerMap[countryCode]
    const preferredProvider = providers.find((p) => p.id === preferredProviderId)

    if (preferredProvider) {
      try {
        const id = await preferredProvider.send(request)
        return { id, providerId: preferredProvider.id }
      } catch (error) {
        // Fallback to other providers
      }
    }

    // Fallback strategy for other providers
    for (const provider of providers) {
      if (provider.id === preferredProviderId) continue

      try {
        const id = await provider.send(request)
        return { id, providerId: provider.id }
      } catch (error) {
        continue
      }
    }

    throw new Error('All providers failed')
  }
}
```

### Custom Strategy: Weighted Selection

```typescript
import type { StrategyFunction, Provider } from '@webventures/comms'

interface WeightedProvider extends Provider {
  weight: number // Higher weight = higher probability
}

/**
 * Weighted strategy - selects providers based on probability weights
 * Useful for gradual rollouts, A/B testing, or load distribution
 */
const weightedStrategy: StrategyFunction = (providers: Provider[]) => {
  const weighted = providers as WeightedProvider[]
  const totalWeight = weighted.reduce((sum, p) => sum + (p.weight || 1), 0)

  return async (request) => {
    // Select provider based on weighted probability
    let random = Math.random() * totalWeight
    let selectedProvider: Provider | undefined

    for (const provider of weighted) {
      random -= provider.weight || 1
      if (random <= 0) {
        selectedProvider = provider
        break
      }
    }

    // Fallback to first provider if selection fails
    selectedProvider = selectedProvider || weighted[0]

    if (!selectedProvider) {
      throw new Error('No providers available')
    }

    try {
      const id = await selectedProvider.send(request)
      return { id, providerId: selectedProvider.id }
    } catch (error) {
      // Optionally implement fallback to other providers
      if (error instanceof Error) {
        ;(error as Error & { providerId?: string }).providerId = selectedProvider.id
      }
      throw error
    }
  }
}

const comms = new CommsSdk({
  channels: {
    email: {
      multiProviderStrategy: weightedStrategy,
      providers: [
        {
          type: 'sendgrid',
          apiKey: process.env.SENDGRID_KEY,
          weight: 70, // 70% of traffic
        } as any,
        {
          type: 'ses',
          region: 'us-east-1',
          accessKeyId: process.env.AWS_KEY,
          secretAccessKey: process.env.AWS_SECRET,
          weight: 20, // 20% of traffic
        } as any,
        {
          type: 'mailgun',
          apiKey: process.env.MAILGUN_KEY,
          domainName: 'mg.example.com',
          weight: 10, // 10% of traffic (testing new provider)
        } as any,
      ],
    },
  },
})

// Send 1000 emails - distribution will be approximately 70/20/10
for (let i = 0; i < 1000; i++) {
  await comms.send({
    email: {
      from: 'noreply@example.com',
      to: `user${i}@example.com`,
      subject: 'Test',
      text: 'Testing weighted distribution',
    },
  })
}
```

**Use Cases for Weighted Strategy:**

- **Gradual Rollout**: Start with 10% traffic to new provider, gradually increase
- **A/B Testing**: Split traffic to compare provider performance
- **Cost Optimization**: Route more traffic to cheaper providers
- **Load Balancing**: Distribute based on provider capacity
- **Geographic Distribution**: Weight providers by user location

---

## Error Handling Examples

### Comprehensive Error Handling

```typescript
import {
  isSuccessResponse,
  isErrorResponse,
  isProviderError,
  isCommsError,
  getErrors,
} from '@webventures/comms'

async function sendNotificationWithErrorHandling(user: User) {
  try {
    const result = await comms.send({
      email: {
        from: 'noreply@example.com',
        to: user.email,
        subject: 'Test',
        text: 'Hello',
      },
    })

    if (isSuccessResponse(result)) {
      console.log('✅ Notification sent successfully')
      console.log('Email ID:', result.channels?.email?.id)
      return { success: true, result }
    }

    if (isErrorResponse(result)) {
      console.error('❌ Notification failed')
      const errors = getErrors(result)

      errors.forEach((error) => {
        if (isProviderError(error)) {
          console.error(`Provider ${error.providerId} failed:`, error.message)
          console.error(`Channel: ${error.channel}`)

          // Take action based on provider error
          if (error.message.includes('Invalid API key')) {
            alertAdmins('Provider credentials need updating')
          }
        }
      })

      return { success: false, errors }
    }
  } catch (error) {
    console.error('Unexpected error:', error)

    if (isCommsError(error)) {
      console.error('SDK Error Code:', error.code)
      console.error('SDK Error Cause:', error.cause)
    }

    return { success: false, error }
  }
}
```

### Retry Logic with Exponential Backoff

```typescript
async function sendWithRetry(
  request: NotificationRequest,
  maxRetries = 3
): Promise<NotificationStatus> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await comms.send(request)

      if (result.status === 'success') {
        return result
      }

      // If error, retry after exponential backoff
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000
        console.log(`Retry attempt ${attempt + 1} after ${delay}ms`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    } catch (error) {
      if (attempt === maxRetries - 1) {
        throw error
      }

      const delay = Math.pow(2, attempt) * 1000
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw new Error('Max retries exceeded')
}

const result = await sendWithRetry({
  email: {
    from: 'noreply@example.com',
    to: 'user@example.com',
    subject: 'Test',
    text: 'Hello',
  },
})
```

---

## Testing Examples

### Unit Testing with Mocks

```typescript
import { describe, it, expect, vi } from 'vitest'
import CommsSdk from '@webventures/comms'

describe('Notification Service', () => {
  it('should send email successfully', async () => {
    const mockSend = vi.fn().mockResolvedValue({
      status: 'success',
      channels: {
        email: {
          id: 'test-message-id',
          providerId: 'sendgrid',
        },
      },
    })

    vi.mock('@webventures/comms', () => ({
      default: vi.fn().mockImplementation(() => ({
        send: mockSend,
      })),
    }))

    const comms = new CommsSdk({})
    const result = await comms.send({
      email: {
        from: 'test@example.com',
        to: 'user@example.com',
        subject: 'Test',
        text: 'Test message',
      },
    })

    expect(result.status).toBe('success')
    expect(mockSend).toHaveBeenCalledWith({
      email: {
        from: 'test@example.com',
        to: 'user@example.com',
        subject: 'Test',
        text: 'Test message',
      },
    })
  })
})
```

### Integration Testing with Notification Catcher

```typescript
import CommsSdk from '@webventures/comms'
import fetch from 'undici'

describe('Email Integration Tests', () => {
  const comms = new CommsSdk({
    useNotificationCatcher: true,
  })

  beforeAll(async () => {
    // Clear notification catcher
    await fetch('http://localhost:1080/api/messages', { method: 'DELETE' })
  })

  it('should send email to notification catcher', async () => {
    const result = await comms.send({
      email: {
        from: 'test@example.com',
        to: 'user@example.com',
        subject: 'Test Email',
        html: '<h1>Test</h1>',
      },
    })

    expect(result.status).toBe('success')

    // Verify in notification catcher
    const response = await fetch('http://localhost:1080/api/messages')
    const messages = await response.json()

    expect(messages.length).toBe(1)
    expect(messages[0].subject).toBe('Test Email')
  })
})
```

---

## Production Examples

### Production-Ready Email Service

```typescript
import CommsSdk from '@webventures/comms'
import winston from 'winston'

class EmailService {
  private comms: CommsSdk
  private logger: winston.Logger

  constructor() {
    this.comms = new CommsSdk({
      channels: {
        email: {
          multiProviderStrategy: 'fallback',
          providers: [
            { type: 'sendgrid', apiKey: process.env.SENDGRID_API_KEY! },
            {
              type: 'ses',
              region: 'us-east-1',
              accessKeyId: process.env.AWS_KEY!,
              secretAccessKey: process.env.AWS_SECRET!,
            },
          ],
        },
      },
    })

    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
      ],
    })

    // Configure SDK logger
    this.comms.logger.configure([new winston.transports.File({ filename: 'notifications.log' })])
  }

  async sendTransactional(to: string, subject: string, html: string) {
    try {
      const result = await this.comms.send({
        email: {
          from: process.env.FROM_EMAIL!,
          to,
          subject,
          html,
        },
      })

      this.logger.info('Email sent', {
        to,
        subject,
        messageId: result.channels?.email?.id,
        provider: result.channels?.email?.providerId,
      })

      return result
    } catch (error) {
      this.logger.error('Email failed', {
        to,
        subject,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }
}

export const emailService = new EmailService()
```

### Queue-Based Notification System

```typescript
import Queue from 'bull'
import CommsSdk from '@webventures/comms'

const notificationQueue = new Queue('notifications', {
  redis: { host: 'localhost', port: 6379 },
})

const comms = new CommsSdk({
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

// Process notifications
notificationQueue.process(async (job) => {
  const { channel, data } = job.data

  try {
    const result = await comms.send({
      [channel]: data,
    })

    return result
  } catch (error) {
    console.error('Notification failed:', error)
    throw error
  }
})

// Queue notification
export async function queueNotification(channel: string, data: any) {
  return await notificationQueue.add(
    { channel, data },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    }
  )
}

// Usage
await queueNotification('email', {
  from: 'noreply@example.com',
  to: 'user@example.com',
  subject: 'Hello',
  text: 'World',
})
```

---

## Advanced Examples

### Dynamic Provider Selection

```typescript
class DynamicNotificationService {
  private commsSdk: CommsSdk

  constructor() {
    this.commsSdk = new CommsSdk({
      channels: {
        email: {
          providers: [
            { type: 'sendgrid', apiKey: process.env.SENDGRID_API_KEY!, id: 'sendgrid-marketing' },
            {
              type: 'ses',
              region: 'us-east-1',
              accessKeyId: process.env.AWS_KEY!,
              secretAccessKey: process.env.AWS_SECRET!,
              id: 'ses-transactional',
            },
          ],
          multiProviderStrategy: (providers) => {
            return async (request: any) => {
              // Choose provider based on email type
              const provider =
                request.emailType === 'marketing'
                  ? providers.find((p) => p.id === 'sendgrid-marketing')
                  : providers.find((p) => p.id === 'ses-transactional')

              if (!provider) throw new Error('No suitable provider')

              const id = await provider.send(request)
              return { id, providerId: provider.id }
            }
          },
        },
      },
    })
  }

  async sendEmail(to: string, subject: string, html: string, type: 'marketing' | 'transactional') {
    return this.commsSdk.send({
      email: {
        from: type === 'marketing' ? 'newsletter@example.com' : 'noreply@example.com',
        to,
        subject,
        html,
        emailType: type,
      } as any,
    })
  }
}
```

### Rate Limiting

```typescript
import rateLimit from 'express-rate-limit'
import RedisStore from 'rate-limit-redis'
import { createClient } from 'redis'

const redisClient = createClient()

const notificationLimiter = rateLimit({
  store: new RedisStore({ client: redisClient }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many notifications sent from this IP',
})

app.post('/api/send-notification', notificationLimiter, async (req, res) => {
  const result = await comms.send(req.body)
  res.json(result)
})
```

---

## See Also

- [Main Documentation](./README.md)
- [API Reference](./API.md)
- [Provider Configuration](./PROVIDERS.md)
- [Framework Integration](./FRAMEWORKS.md)
- [Architecture](./ARCHITECTURE.md)
