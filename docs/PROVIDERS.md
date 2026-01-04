# Provider Configuration Guide

Complete guide for configuring all notification providers in WebVentures Comms SDK v2.0.1.

## Table of Contents

- [Email Providers](#email-providers)
- [SMS Providers](#sms-providers)
- [Push Providers](#push-providers)
- [Voice Providers](#voice-providers)
- [Webpush Providers](#webpush-providers)
- [Slack Providers](#slack-providers)
- [WhatsApp Providers](#whatsapp-providers)
- [Custom Providers](#custom-providers)
- [Logger Provider](#logger-provider)

---

## Email Providers

Send emails through various providers with support for HTML content, attachments, CC/BCC, and custom headers.

### SMTP

Standard SMTP protocol - works with almost any email service.

```typescript
{
  type: 'smtp',
  host: 'smtp.example.com',
  port: 587, // 25, 465, or 587
  secure: false, // true for 465, false for others
  auth: {
    user: 'your-username',
    pass: 'your-password'
  }
}
```

**Advanced Configuration:**

```typescript
{
  type: 'smtp',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'user@gmail.com',
    pass: 'app-password' // Use app-specific password for Gmail
  },
  // TLS options
  tls: {
    rejectUnauthorized: true,
    minVersion: 'TLSv1.2'
  },
  // Connection options
  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 60000,
  // Pooling
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  // Rate limiting
  rateDelta: 1000,
  rateLimit: 10
}
```

**OAuth 2.0 Authentication:**

```typescript
// Three-legged OAuth
{
  type: 'smtp',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    type: 'oauth2',
    user: 'user@gmail.com',
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret',
    refreshToken: 'your-refresh-token'
  }
}

// Two-legged OAuth (Service Account)
{
  type: 'smtp',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    type: 'oauth2',
    user: 'user@example.com',
    serviceClient: 'service-account@project.iam.gserviceaccount.com',
    privateKey: '-----BEGIN PRIVATE KEY-----\n...'
  }
}
```

### SendGrid

Cloud-based email delivery service with high deliverability.

```typescript
{
  type: 'sendgrid',
  apiKey: 'SG.xxxxxxxxxxxxx'
}
```

**Getting API Key:**

1. Sign up at https://sendgrid.com
2. Go to Settings → API Keys
3. Create new API key with "Mail Send" permissions

**Example:**

```typescript
await comms.send({
  email: {
    from: 'noreply@example.com',
    to: 'user@example.com',
    subject: 'Welcome',
    html: '<h1>Welcome!</h1>',
  },
})
```

### AWS SES (Simple Email Service)

Amazon's scalable email service with low cost.

```typescript
{
  type: 'ses',
  region: 'us-east-1',
  accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  sessionToken: 'optional-session-token' // For temporary credentials
}
```

**Setup:**

1. Create AWS account
2. Verify email address or domain in SES console
3. Create IAM user with SES permissions
4. Generate access key ID and secret

**Production Setup:**

- Request production access (starts in sandbox mode)
- Verify your sending domain
- Set up SPF, DKIM, and DMARC records

### Mailgun

Developer-friendly email API with powerful analytics.

```typescript
{
  type: 'mailgun',
  apiKey: 'key-xxxxxxxxxxxxxxxx',
  domainName: 'mg.example.com'
}
```

**Setup:**

1. Sign up at https://www.mailgun.com
2. Add and verify your domain
3. Get API key from Settings → API Keys
4. Use verified domain in configuration

### Mandrill

Transactional email service by Mailchimp.

```typescript
{
  type: 'mandrill',
  apiKey: 'your-mandrill-api-key'
}
```

**Setup:**

1. Sign up for Mailchimp
2. Enable Mandrill add-on
3. Get API key from Mandrill dashboard

**Note:** Mandrill is now part of Mailchimp Transactional Email.

### SparkPost

High-performance email delivery platform.

```typescript
{
  type: 'sparkpost',
  apiKey: 'your-sparkpost-api-key'
}
```

**Setup:**

1. Sign up at https://www.sparkpost.com
2. Verify sending domain
3. Create API key with "Transmissions: Read/Write" permissions

### Sendmail

Uses local sendmail binary for email delivery.

```typescript
{
  type: 'sendmail',
  sendmail: true,
  path: '/usr/sbin/sendmail',
  newline: 'unix'
}
```

**Configuration Options:**

```typescript
{
  type: 'sendmail',
  sendmail: true,
  path: '/usr/sbin/sendmail',
  newline: 'unix', // or 'windows'
  args: ['-f', 'sender@example.com'],
  attachDataUrls: false,
  disableFileAccess: true,
  disableUrlAccess: true
}
```

**Use Cases:**

- Server with configured MTA (Postfix, Exim)
- Local development without external SMTP
- Legacy system integration

---

## SMS Providers

Send text messages globally through various SMS gateways.

### Twilio

Popular SMS API with global coverage.

```typescript
{
  type: 'twilio',
  accountSid: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  authToken: 'your_auth_token_here'
}
```

**Setup:**

1. Sign up at https://www.twilio.com
2. Get phone number or short code
3. Find Account SID and Auth Token in Console

**Example:**

```typescript
await comms.send({
  sms: {
    from: '+1234567890',
    to: '+0987654321',
    text: 'Your verification code: 123456',
  },
})
```

### Nexmo/Vonage

Global SMS API with competitive pricing.

```typescript
{
  type: 'nexmo',
  apiKey: 'your-nexmo-api-key',
  apiSecret: 'your-nexmo-api-secret'
}
```

**Setup:**

1. Sign up at https://www.vonage.com
2. Get API credentials from Dashboard

### Plivo

Developer-friendly SMS API.

```typescript
{
  type: 'plivo',
  authId: 'MAXXXXXXXXXXXXXXXXXX',
  authToken: 'your-auth-token'
}
```

### Infobip

Enterprise SMS platform with global reach.

```typescript
{
  type: 'infobip',
  username: 'your-username',
  password: 'your-password'
}
```

**Features:**

- Global coverage (200+ countries)
- Two-way messaging
- Bulk SMS support
- Number lookup

### OVH

European SMS provider with competitive rates.

```typescript
{
  type: 'ovh',
  appKey: 'your-app-key',
  appSecret: 'your-app-secret',
  consumerKey: 'your-consumer-key',
  account: 'sms-account-name',
  host: 'ovh-eu' // or 'ovh-ca', 'ovh-us'
}
```

**Setup:**

1. Create OVH account
2. Create application at https://eu.api.ovh.com/createApp/
3. Generate consumer key
4. Create SMS account

**Available Hosts:**

- `ovh-eu`: Europe
- `ovh-ca`: Canada
- `ovh-us`: United States

### Callr

French SMS provider with API access.

```typescript
{
  type: 'callr',
  login: 'your-login',
  password: 'your-password'
}
```

### Clickatell

Global SMS aggregator.

```typescript
{
  type: 'clickatell',
  apiKey: 'your-one-way-api-key'
}
```

**Note:** Use One-way Integration API key (not REST API key).

### 46elks

Scandinavian SMS provider.

```typescript
{
  type: '46elks',
  apiUsername: 'uXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  apiPassword: 'your-api-password'
}
```

**Features:**

- SMS, MMS, Voice
- Nordic region focus
- Competitive pricing

### Seven (7pass)

German SMS provider.

```typescript
{
  type: 'seven',
  apiKey: 'your-api-key'
}
```

**Features:**

- European coverage
- Developer-friendly API
- Affordable pricing

---

## Push Providers

Send mobile push notifications to iOS, Android, and Windows devices.

### APNs (Apple Push Notification service)

iOS push notifications.

**Token-based Authentication (Recommended):**

```typescript
{
  type: 'apn',
  token: {
    key: '/path/to/AuthKey_KEYID.p8',
    keyId: 'KEYID123456',
    teamId: 'TEAMID1234'
  },
  production: true
}
```

**Certificate-based Authentication:**

```typescript
{
  type: 'apn',
  cert: '/path/to/cert.pem',
  key: '/path/to/key.pem',
  production: true,
  passphrase: 'certificate-passphrase'
}
```

**PKCS#12 Certificate:**

```typescript
{
  type: 'apn',
  pfx: '/path/to/certificate.p12',
  passphrase: 'p12-password',
  production: true
}
```

**Setup:**

1. Log in to Apple Developer account
2. Create App ID and enable Push Notifications
3. Create APNs key (.p8) or certificate
4. Download and configure in app

**Example:**

```typescript
await comms.send({
  push: {
    registrationToken: 'device-token-here',
    title: 'New Message',
    body: 'You have a new message',
    badge: 1,
    sound: 'default',
    topic: 'com.example.app', // Bundle ID
  },
})
```

### FCM (Firebase Cloud Messaging)

Android and iOS push notifications via Firebase.

```typescript
{
  type: 'fcm',
  id: 'your-fcm-server-key',
  phonegap: false
}
```

**Setup:**

1. Create Firebase project
2. Add your app to Firebase
3. Get Server Key from Project Settings → Cloud Messaging
4. Download google-services.json (Android) or GoogleService-Info.plist (iOS)

**PhoneGap/Cordova Mode:**

```typescript
{
  type: 'fcm',
  id: 'your-server-key',
  phonegap: true // Formats data for PhoneGap Push Plugin
}
```

**Example:**

```typescript
await comms.send({
  push: {
    registrationToken: 'fcm-device-token',
    title: 'Notification Title',
    body: 'Notification body text',
    icon: 'notification_icon',
    color: '#FF0000',
    priority: 'high',
    custom: {
      userId: '123',
      action: 'open_chat',
    },
  },
})
```

### WNS (Windows Push Notification Service)

Windows device notifications.

```typescript
{
  type: 'wns',
  clientId: 'your-package-sid',
  clientSecret: 'your-client-secret',
  notificationMethod: 'sendTileSquareBlock'
}
```

**Notification Methods:**

- Tiles: `sendTileSquareBlock`, `sendTileWideBlockAndText01`
- Toast: `sendToastText01`, `sendToastImageAndText01`
- Badge: `sendBadge`
- Raw: `sendRaw`

**Setup:**

1. Register app in Windows Dev Center
2. Get Package SID and Client Secret
3. Configure notification templates

### ADM (Amazon Device Messaging)

Push notifications for Amazon Fire devices.

```typescript
{
  type: 'adm',
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret'
}
```

**Setup:**

1. Register app in Amazon Developer Console
2. Enable Device Messaging
3. Get Client ID and Client Secret

---

## Voice Providers

Make automated voice calls with programmable content.

### Twilio Voice

Programmable voice calls with TwiML.

```typescript
{
  type: 'twilio',
  accountSid: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  authToken: 'your_auth_token_here'
}
```

**Example:**

```typescript
await comms.send({
  voice: {
    from: '+1234567890',
    to: '+0987654321',
    url: 'https://example.com/twiml/voice.xml',
    method: 'GET',
    timeout: 30,
    machineDetection: 'Enable',
  },
})
```

**TwiML Example:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hello! Your verification code is 1 2 3 4 5 6.</Say>
  <Pause length="1"/>
  <Say voice="alice">Please enter it now.</Say>
</Response>
```

---

## Webpush Providers

Browser push notifications following W3C Push API standard.

### GCM/FCM with VAPID

Web push using VAPID authentication (recommended).

```typescript
{
  type: 'gcm',
  vapidDetails: {
    subject: 'mailto:admin@example.com',
    publicKey: 'BEl62iUYg...',
    privateKey: 'p6YVD7t...'
  },
  ttl: 3600
}
```

**Generate VAPID Keys:**

```bash
npx web-push generate-vapid-keys
```

**Legacy GCM API Key:**

```typescript
{
  type: 'gcm',
  gcmAPIKey: 'your-gcm-api-key'
}
```

**Client-Side Subscription:**

```javascript
// In your web app
navigator.serviceWorker.ready.then((registration) => {
  registration.pushManager
    .subscribe({
      userVisibleOnly: true,
      applicationServerKey: 'YOUR_PUBLIC_VAPID_KEY',
    })
    .then((subscription) => {
      // Send subscription to your server
      console.log(JSON.stringify(subscription))
    })
})
```

**Example:**

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
    title: 'New Update',
    body: 'Your app has been updated',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    requireInteraction: true,
    actions: [
      { action: 'view', title: 'View', icon: '/view-icon.png' },
      { action: 'dismiss', title: 'Dismiss', icon: '/dismiss-icon.png' },
    ],
  },
})
```

---

## Slack Providers

Send messages to Slack channels.

### Webhook

Incoming webhooks for simple message posting.

```typescript
{
  type: 'webhook',
  webhookUrl: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXX'
}
```

**Setup:**

1. Go to https://api.slack.com/apps
2. Create new app or select existing
3. Enable "Incoming Webhooks"
4. Add webhook to channel
5. Copy webhook URL

**Example:**

```typescript
await comms.send({
  slack: {
    text: 'Deployment completed successfully! :tada:',
    attachments: [
      {
        color: 'good',
        title: 'Production Deployment',
        fields: [
          { title: 'Environment', value: 'Production', short: true },
          { title: 'Version', value: '2.0.1', short: true },
          { title: 'Duration', value: '5m 23s', short: true },
          { title: 'Status', value: 'Success', short: true },
        ],
        footer: 'CI/CD Pipeline',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  },
})
```

**Dynamic Webhook URLs:**

```typescript
{
  type: 'webhook'
  // No webhookUrl in provider config
}

// Specify in request
await comms.send({
  slack: {
    webhookUrl: 'https://hooks.slack.com/services/...',
    text: 'Message to specific channel',
  },
})
```

---

## WhatsApp Providers

Send WhatsApp Business messages.

### Infobip

WhatsApp Business API via Infobip.

```typescript
{
  type: 'infobip',
  baseUrl: 'https://api.infobip.com',
  apiKey: 'your-infobip-api-key'
}
```

**Setup:**

1. Sign up for Infobip account
2. Apply for WhatsApp Business API access
3. Complete WhatsApp Business verification
4. Get API key from Infobip portal

**Example - Text Message:**

```typescript
await comms.send({
  whatsapp: {
    from: '441234567890',
    to: '441234567891',
    type: 'text',
    text: 'Hello from WhatsApp Business!',
  },
})
```

**Example - Template Message:**

```typescript
await comms.send({
  whatsapp: {
    from: '441234567890',
    to: '441234567891',
    type: 'template',
    templateName: 'welcome_message',
    templateData: {
      name: 'John',
      code: '123456',
    },
  },
})
```

**Example - Media Message:**

```typescript
await comms.send({
  whatsapp: {
    from: '441234567890',
    to: '441234567891',
    type: 'image',
    mediaUrl: 'https://example.com/image.jpg',
  },
})
```

---

## Custom Providers

Implement your own provider for any service.

### Email Custom Provider

```typescript
{
  type: 'custom',
  id: 'my-email-service',
  send: async (request: EmailRequest) => {
    // Your custom implementation
    const response = await myEmailApi.send({
      from: request.from,
      to: request.to,
      subject: request.subject,
      html: request.html
    })

    return response.messageId
  }
}
```

### SMS Custom Provider

```typescript
{
  type: 'custom',
  id: 'my-sms-gateway',
  send: async (request: SmsRequest) => {
    const response = await fetch('https://api.mysms.com/send', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.SMS_API_KEY}` },
      body: JSON.stringify({
        from: request.from,
        to: request.to,
        message: request.text
      })
    })

    const data = await response.json()
    return data.messageId
  }
}
```

### Push Custom Provider

```typescript
{
  type: 'custom',
  id: 'custom-push-service',
  send: async (request: PushRequest) => {
    // Integrate with any push service
    const result = await customPushService.send({
      token: request.registrationToken,
      notification: {
        title: request.title,
        body: request.body,
        data: request.custom
      }
    })

    return result.id
  }
}
```

### Advanced Custom Provider with Error Handling

```typescript
import { ProviderError } from '@webventures/comms'

{
  type: 'custom',
  id: 'robust-email-provider',
  send: async (request: EmailRequest) => {
    try {
      const response = await myApi.send(request)

      if (!response.ok) {
        throw new ProviderError(
          `Email send failed: ${response.statusText}`,
          'robust-email-provider',
          'email',
          response.status.toString()
        )
      }

      return response.messageId
    } catch (error) {
      if (error instanceof ProviderError) throw error

      throw new ProviderError(
        `Unexpected error: ${error.message}`,
        'robust-email-provider',
        'email',
        'UNKNOWN_ERROR',
        error
      )
    }
  }
}
```

---

## Logger Provider

Development and testing provider that logs notifications instead of sending them.

### Usage

```typescript
{
  type: 'logger'
}
```

### All Channels

Available for all channels: email, sms, push, voice, webpush, slack, whatsapp.

```typescript
const comms = new CommsSdk({
  channels: {
    email: {
      providers: [{ type: 'logger' }],
    },
    sms: {
      providers: [{ type: 'logger' }],
    },
    push: {
      providers: [{ type: 'logger' }],
    },
  },
})
```

### Example Output

```
Email notification (logger):
  From: noreply@example.com
  To: user@example.com
  Subject: Welcome
  HTML: <h1>Welcome!</h1>
```

### Use Cases

- Local development without external services
- Unit testing
- CI/CD pipelines
- Debugging notification logic

---

## Provider Comparison Tables

### Email Providers

| Provider  | Setup Difficulty | Free Tier               | Best For               |
| --------- | ---------------- | ----------------------- | ---------------------- |
| SMTP      | Medium           | Varies                  | Universal, self-hosted |
| SendGrid  | Easy             | 100/day                 | Startups, easy setup   |
| SES       | Medium           | 62,000/month (with EC2) | High volume, AWS users |
| Mailgun   | Easy             | 5,000/month             | Developers, API-first  |
| Mandrill  | Medium           | Paid only               | Mailchimp users        |
| SparkPost | Easy             | 100/day                 | Analytics-focused      |
| Sendmail  | Hard             | Free                    | Local/legacy systems   |

### SMS Providers

| Provider     | Global Coverage | Pricing     | Best For            |
| ------------ | --------------- | ----------- | ------------------- |
| Twilio       | Excellent       | Medium      | Global, reliable    |
| Nexmo/Vonage | Excellent       | Low-Medium  | Cost-effective      |
| Plivo        | Good            | Low         | Budget-conscious    |
| Infobip      | Excellent       | Medium-High | Enterprise          |
| OVH          | Europe          | Low         | European market     |
| Clickatell   | Good            | Medium      | Established apps    |
| 46elks       | Nordic          | Low         | Scandinavian market |
| Seven        | Europe          | Low         | German market       |

### Push Providers

| Provider | Platforms    | Setup  | Features                   |
| -------- | ------------ | ------ | -------------------------- |
| APNs     | iOS          | Medium | Rich notifications, badges |
| FCM      | Android, iOS | Easy   | Cross-platform, free       |
| WNS      | Windows      | Medium | Tiles, toasts, badges      |
| ADM      | Amazon Fire  | Medium | Fire tablets/phones        |

---

## Best Practices

### Security

1. **Never commit API keys** - Use environment variables
2. **Rotate keys regularly** - Update credentials periodically
3. **Use minimal permissions** - Grant only necessary access
4. **Encrypt sensitive data** - Use secrets management services

### Reliability

1. **Use fallback providers** - Configure backup providers
2. **Monitor delivery rates** - Track success/failure rates
3. **Implement retry logic** - Handle transient failures
4. **Set up alerting** - Get notified of issues

### Performance

1. **Enable connection pooling** - For SMTP providers
2. **Use async operations** - Don't block on sends
3. **Batch when possible** - Some providers support bulk
4. **Cache credentials** - Avoid repeated auth calls

### Cost Optimization

1. **Compare pricing** - Different providers for different volumes
2. **Use free tiers** - Start with free plans
3. **Monitor usage** - Track costs regularly
4. **Optimize content** - Reduce message size

---

## Troubleshooting

### Common Issues

**SMTP Connection Errors:**

- Check firewall rules (allow outbound on ports 25/465/587)
- Verify credentials are correct
- Check if provider requires app-specific passwords (Gmail)
- Enable "Less secure apps" if needed (not recommended)

**Provider Authentication Failures:**

- Verify API keys are active
- Check key has correct permissions
- Ensure credentials aren't expired
- Try regenerating API key

**Delivery Failures:**

- Verify sender is authorized (SPF, DKIM)
- Check recipient address is valid
- Review provider logs for details
- Ensure account is not suspended

**Rate Limiting:**

- Implement exponential backoff
- Use connection pooling
- Batch messages when possible
- Upgrade plan if hitting limits

---

## See Also

- [Main Documentation](./README.md)
- [API Reference](./API.md)
- [Framework Integration](./FRAMEWORKS.md)
- [Examples](./EXAMPLES.md)
