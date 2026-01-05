# API Reference

Complete API documentation for WebVentures Comms SDK v2.0.1.

## Table of Contents

- [CommsSdk Class](#commssdk-class)
- [Configuration Types](#configuration-types)
- [Request Types](#request-types)
- [Response Types](#response-types)
- [Provider Types](#provider-types)
- [Strategy Types](#strategy-types)
- [Error Types](#error-types)
- [Utility Functions](#utility-functions)
- [Constants](#constants)

## CommsSdk Class

### Constructor

```typescript
new CommsSdk(options: CommsSdkConfig): CommsSdk
```

Creates a new WebVentures Comms SDK instance.

**Parameters:**

- `options` (CommsSdkConfig): Configuration object

**Returns:**

- CommsSdk instance

**Example:**

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
```

### Methods

#### send()

```typescript
send(request: NotificationRequest): Promise<NotificationStatus>
```

Sends a notification through one or more channels.

**Parameters:**

- `request` (NotificationRequest): Notification request object containing channel-specific data

**Returns:**

- Promise<NotificationStatus>: Result of the send operation

**Example:**

```typescript
const result = await comms.send({
  email: {
    from: 'noreply@example.com',
    to: 'user@example.com',
    subject: 'Welcome',
    text: 'Welcome to our platform!',
  },
  sms: {
    from: '+1234567890',
    to: '+0987654321',
    text: 'Welcome!',
  },
})

console.log(result.status) // 'success' or 'error'
console.log(result.channels?.email?.id) // Message ID from provider
```

### Properties

#### logger

```typescript
logger: LoggerInstance
```

Winston logger instance for controlling SDK logging behavior.

**Methods:**

- `logger.mute()`: Disable all logging
- `logger.configure(transports: unknown[])`: Configure custom Winston transports
- `logger.error(message: string, ...meta: unknown[]): void`
- `logger.warn(message: string, ...meta: unknown[]): void`
- `logger.info(message: string, ...meta: unknown[]): void`
- `logger.debug(message: string, ...meta: unknown[]): void`

**Example:**

```typescript
import winston from 'winston'

// Mute all logs
comms.logger.mute()

// Configure custom logging
comms.logger.configure([
  new winston.transports.Console({ level: 'warn' }),
  new winston.transports.File({ filename: 'notifications.log' }),
])
```

---

## Configuration Types

### CommsSdkConfig

Main SDK configuration interface.

```typescript
interface CommsSdkConfig {
  useNotificationCatcher?: boolean
  channels?: {
    email?: ChannelConfig
    sms?: ChannelConfig
    push?: ChannelConfig
    voice?: ChannelConfig
    webpush?: ChannelConfig
    slack?: ChannelConfig
    whatsapp?: ChannelConfig
    [customChannel: string]: ChannelConfig | undefined
  }
}
```

**Properties:**

| Property                 | Type    | Required | Description                                                                                                         |
| ------------------------ | ------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| `useNotificationCatcher` | boolean | No       | If true, all notifications are sent to notification catcher (localhost:1025). Overrides all channel configurations. |
| `channels`               | object  | No       | Channel-specific configurations. Each channel can have multiple providers and a strategy.                           |

**Example:**

```typescript
const config: CommsSdkConfig = {
  useNotificationCatcher: false,
  channels: {
    email: {
      multiProviderStrategy: 'fallback',
      providers: [
        { type: 'sendgrid', apiKey: 'xxx' },
        { type: 'ses', region: 'us-east-1', accessKeyId: 'xxx', secretAccessKey: 'xxx' },
      ],
    },
    sms: {
      multiProviderStrategy: 'roundrobin',
      providers: [
        { type: 'twilio', accountSid: 'xxx', authToken: 'xxx' },
        { type: 'nexmo', apiKey: 'xxx', apiSecret: 'xxx' },
      ],
    },
  },
}
```

### ChannelConfig

Configuration for a specific notification channel.

```typescript
interface ChannelConfig<TProviderConfig extends ProviderConfig = ProviderConfig> {
  providers: TProviderConfig[]
  multiProviderStrategy?: MultiProviderStrategyType | StrategyFunction
}
```

**Properties:**

| Property                | Type               | Required | Default    | Description                                                                                   |
| ----------------------- | ------------------ | -------- | ---------- | --------------------------------------------------------------------------------------------- |
| `providers`             | ProviderConfig[]   | Yes      | -          | Array of provider configurations for this channel                                             |
| `multiProviderStrategy` | string \| function | No       | 'fallback' | Strategy for selecting providers: 'fallback', 'roundrobin', 'no-fallback', or custom function |

### ProviderConfig

Base configuration for any provider.

```typescript
interface ProviderConfig {
  type: string
  id?: string
  [key: string]: unknown
}
```

**Properties:**

| Property | Type   | Required | Description                                                  |
| -------- | ------ | -------- | ------------------------------------------------------------ |
| `type`   | string | Yes      | Provider type identifier (e.g., 'sendgrid', 'twilio', 'fcm') |
| `id`     | string | No       | Optional custom provider ID for logging and identification   |

### CustomProviderConfig

Configuration for custom provider implementations.

```typescript
interface CustomProviderConfig<TRequest = unknown> extends ProviderConfig {
  type: 'custom'
  id: string
  send: (request: TRequest) => Promise<string>
}
```

**Properties:**

| Property | Type     | Required | Description                                                       |
| -------- | -------- | -------- | ----------------------------------------------------------------- |
| `type`   | 'custom' | Yes      | Must be 'custom'                                                  |
| `id`     | string   | Yes      | Unique identifier for this provider                               |
| `send`   | function | Yes      | Async function that sends the notification and returns message ID |

**Example:**

```typescript
const customEmailProvider: CustomProviderConfig<EmailRequest> = {
  type: 'custom',
  id: 'my-email-service',
  send: async (request) => {
    // Custom implementation
    const response = await myEmailService.send(request)
    return response.messageId
  },
}
```

### EnvironmentConfig

Runtime environment configuration.

```typescript
interface EnvironmentConfig {
  httpProxy?: string
  catcherOptions?: string
  isSSR?: boolean
  isReactNative?: boolean
  isNextJS?: boolean
  isExpo?: boolean
}
```

**Properties:**

| Property         | Type    | Description                                                            |
| ---------------- | ------- | ---------------------------------------------------------------------- |
| `httpProxy`      | string  | HTTP proxy URL (also via COMMS_HTTP_PROXY env var)                     |
| `catcherOptions` | string  | Notification catcher SMTP URL (also via COMMS_CATCHER_OPTIONS env var) |
| `isSSR`          | boolean | Whether running in SSR environment                                     |
| `isReactNative`  | boolean | Whether running in React Native                                        |
| `isNextJS`       | boolean | Whether running in Next.js                                             |
| `isExpo`         | boolean | Whether running in Expo                                                |

---

## Request Types

### NotificationRequest

Union type for all notification requests. Can contain one or more channel requests.

```typescript
type NotificationRequest = {
  email?: EmailRequest
  sms?: SmsRequest
  push?: PushRequest
  voice?: VoiceRequest
  webpush?: WebpushRequest
  slack?: SlackRequest
  whatsapp?: WhatsappRequest
  telegram?: TelegramRequest
}
```

### RequestMetadata

Base metadata available on all request types.

```typescript
interface RequestMetadata {
  id?: string
  userId?: string
}
```

**Properties:**

| Property | Type   | Description                                              |
| -------- | ------ | -------------------------------------------------------- |
| `id`     | string | Optional unique identifier for this notification request |
| `userId` | string | Optional user identifier for tracking and analytics      |

### EmailRequest

Email notification request.

```typescript
interface EmailRequest extends RequestMetadata {
  from: string
  to: string
  subject: string
  cc?: string[]
  bcc?: string[]
  replyTo?: string
  text?: string
  html?: string
  attachments?: Array<{
    contentType: string
    filename: string
    content: string | Buffer
  }>
  headers?: Record<string, string | number | boolean>
  customize?: (providerId: string, request: EmailRequest) => Promise<EmailRequest>
}
```

**Required Properties:**

| Property  | Type   | Description                            |
| --------- | ------ | -------------------------------------- |
| `from`    | string | Sender email address (RFC 5322 format) |
| `to`      | string | Recipient email address                |
| `subject` | string | Email subject line                     |

**Optional Properties:**

| Property      | Type     | Description                                                |
| ------------- | -------- | ---------------------------------------------------------- |
| `cc`          | string[] | CC recipients                                              |
| `bcc`         | string[] | BCC recipients                                             |
| `replyTo`     | string   | Reply-To email address                                     |
| `text`        | string   | Plain text body                                            |
| `html`        | string   | HTML body                                                  |
| `attachments` | object[] | Email attachments with content type, filename, and content |
| `headers`     | object   | Custom SMTP headers                                        |
| `customize`   | function | Function to customize request per provider                 |

**Example:**

```typescript
const emailRequest: EmailRequest = {
  from: 'noreply@example.com',
  to: 'user@example.com',
  subject: 'Your Invoice',
  html: '<h1>Invoice #12345</h1>',
  text: 'Invoice #12345',
  cc: ['manager@example.com'],
  attachments: [
    {
      contentType: 'application/pdf',
      filename: 'invoice.pdf',
      content: pdfBuffer,
    },
  ],
  headers: {
    'X-Custom-Header': 'value',
  },
  id: 'invoice-12345',
  userId: 'user-123',
}
```

### SmsRequest

SMS notification request.

```typescript
interface SmsRequest extends RequestMetadata {
  from: string
  to: string
  text: string
  type?: 'text' | 'unicode'
  nature?: 'marketing' | 'transactional'
  ttl?: number
  messageClass?: 0 | 1 | 2 | 3
  customize?: (providerId: string, request: SmsRequest) => Promise<SmsRequest>
}
```

**Required Properties:**

| Property | Type   | Description                                       |
| -------- | ------ | ------------------------------------------------- |
| `from`   | string | Sender phone number or ID                         |
| `to`     | string | Recipient phone number (E.164 format recommended) |
| `text`   | string | Message text                                      |

**Optional Properties:**

| Property       | Type                           | Default | Description                                           |
| -------------- | ------------------------------ | ------- | ----------------------------------------------------- |
| `type`         | 'text' \| 'unicode'            | 'text'  | Message encoding (text = GSM 7-bit, unicode = UTF-16) |
| `nature`       | 'marketing' \| 'transactional' | -       | Message nature for compliance                         |
| `ttl`          | number                         | -       | Time to live in seconds                               |
| `messageClass` | 0 \| 1 \| 2 \| 3               | -       | Message class (0=flash, 1=ME, 2=SIM, 3=TE)            |
| `customize`    | function                       | -       | Function to customize request per provider            |

**Example:**

```typescript
const smsRequest: SmsRequest = {
  from: '+1234567890',
  to: '+0987654321',
  text: 'Your verification code: 123456',
  type: 'text',
  nature: 'transactional',
  ttl: 300,
  userId: 'user-123',
}
```

### PushRequest

Mobile push notification request.

```typescript
interface PushRequest extends RequestMetadata {
  registrationToken: string
  title: string
  body: string
  custom?: Record<string, unknown>
  priority?: 'high' | 'normal'
  collapseKey?: string
  contentAvailable?: boolean
  delayWhileIdle?: boolean
  restrictedPackageName?: string
  dryRun?: boolean
  icon?: string
  tag?: string
  color?: string
  clickAction?: string
  locKey?: string
  bodyLocArgs?: string
  titleLocKey?: string
  titleLocArgs?: string
  retries?: number
  encoding?: string
  badge?: number
  sound?: string
  alert?: string | Record<string, unknown>
  launchImage?: string
  action?: string
  topic?: string
  category?: string
  mdm?: string
  urlArgs?: string
  truncateAtWordEnd?: boolean
  mutableContent?: number
  expiry?: number
  timeToLive?: number
  headers?: Record<string, string | number | boolean>
  launch?: string
  duration?: string
  consolidationKey?: string
  customize?: (providerId: string, request: PushRequest) => Promise<PushRequest>
}
```

**Required Properties:**

| Property            | Type   | Description             |
| ------------------- | ------ | ----------------------- |
| `registrationToken` | string | Device token (FCM/APNs) |
| `title`             | string | Notification title      |
| `body`              | string | Notification body text  |

**Key Optional Properties:**

| Property   | Type               | Default | Description             |
| ---------- | ------------------ | ------- | ----------------------- |
| `badge`    | number             | -       | Badge count on app icon |
| `sound`    | string             | -       | Sound file name         |
| `priority` | 'high' \| 'normal' | 'high'  | Delivery priority       |
| `custom`   | object             | -       | Custom data payload     |

See [complete PushRequest documentation](../src/models/notification-request.ts) for all properties.

**Example:**

```typescript
const pushRequest: PushRequest = {
  registrationToken: 'device-token-here',
  title: 'New Message',
  body: 'You have a new message from John',
  badge: 1,
  sound: 'default',
  priority: 'high',
  custom: {
    messageId: '123',
    senderId: '456',
  },
  userId: 'user-123',
}
```

### VoiceRequest

Voice call request.

```typescript
interface VoiceRequest extends RequestMetadata {
  from: string
  to: string
  url: string
  method?: string
  fallbackUrl?: string
  fallbackMethod?: string
  statusCallback?: string
  statusCallbackEvent?: string[]
  sendDigits?: string
  machineDetection?: string
  machineDetectionTimeout?: number
  timeout?: number
  customize?: (providerId: string, request: VoiceRequest) => Promise<VoiceRequest>
}
```

**Required Properties:**

| Property | Type   | Description                            |
| -------- | ------ | -------------------------------------- |
| `from`   | string | Caller ID (phone number)               |
| `to`     | string | Recipient phone number                 |
| `url`    | string | URL to fetch call instructions (TwiML) |

**Example:**

```typescript
const voiceRequest: VoiceRequest = {
  from: '+1234567890',
  to: '+0987654321',
  url: 'https://example.com/voice.xml',
  method: 'GET',
  timeout: 30,
  machineDetection: 'Enable',
}
```

### WebpushRequest

Web push notification request (browser notifications).

```typescript
interface WebpushRequest extends RequestMetadata {
  subscription: {
    endpoint: string
    keys: {
      auth: string
      p256dh: string
    }
  }
  title: string
  body: string
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
  badge?: string
  dir?: 'auto' | 'rtl' | 'ltr'
  icon?: string
  image?: string
  redirects?: Record<string, string>
  requireInteraction?: boolean
  customize?: (providerId: string, request: WebpushRequest) => Promise<WebpushRequest>
}
```

**Required Properties:**

| Property                   | Type   | Description                             |
| -------------------------- | ------ | --------------------------------------- |
| `subscription`             | object | Push subscription from browser Push API |
| `subscription.endpoint`    | string | Push service endpoint URL               |
| `subscription.keys.auth`   | string | Authentication secret (base64)          |
| `subscription.keys.p256dh` | string | P256DH public key (base64)              |
| `title`                    | string | Notification title                      |
| `body`                     | string | Notification body                       |

**Example:**

```typescript
const webpushRequest: WebpushRequest = {
  subscription: {
    endpoint: 'https://fcm.googleapis.com/fcm/send/...',
    keys: {
      auth: 'base64-auth-key',
      p256dh: 'base64-p256dh-key',
    },
  },
  title: 'New Message',
  body: 'You have a new message',
  icon: '/icon.png',
  badge: '/badge.png',
  requireInteraction: true,
}
```

### SlackRequest

Slack message request.

```typescript
interface SlackRequest extends RequestMetadata {
  webhookUrl?: string
  text: string
  unfurl_links?: boolean
  attachments?: Array<{
    fallback?: string
    color?: string
    pretext?: string
    author_name?: string
    author_link?: string
    author_icon?: string
    title?: string
    title_link?: string
    text?: string
    fields?: Array<{
      title?: string
      value?: string
      short?: boolean
    }>
    actions?: Array<{
      type: 'button'
      text: string
      url: string
      style?: 'primary' | 'danger'
    }>
    image_url?: string
    thumb_url?: string
    footer?: string
    footer_icon?: string
    ts?: number
  }>
  customize?: (providerId: string, request: SlackRequest) => Promise<SlackRequest>
}
```

**Required Properties:**

| Property | Type   | Description                                 |
| -------- | ------ | ------------------------------------------- |
| `text`   | string | Main message text (supports Slack markdown) |

**Example:**

```typescript
const slackRequest: SlackRequest = {
  text: 'Deployment successful :tada:',
  attachments: [
    {
      color: 'good',
      title: 'Production Deploy',
      text: 'Version 2.0.1 is live',
      fields: [
        { title: 'Environment', value: 'Production', short: true },
        { title: 'Version', value: '2.0.1', short: true },
      ],
      actions: [
        {
          type: 'button',
          text: 'View Logs',
          url: 'https://example.com/logs',
          style: 'primary',
        },
      ],
    },
  ],
}
```

### WhatsappRequest

WhatsApp message request.

```typescript
interface WhatsappRequest extends RequestMetadata {
  from: string
  to: string
  type: 'template' | 'text' | 'document' | 'image' | 'audio' | 'video' | 'sticker'
  text?: string
  mediaUrl?: string
  templateName?: string
  templateData?: Record<string, unknown>
  messageId?: string
  customize?: (providerId: string, request: WhatsappRequest) => Promise<WhatsappRequest>
}
```

**Required Properties:**

| Property | Type   | Description                     |
| -------- | ------ | ------------------------------- |
| `from`   | string | Sender WhatsApp Business number |
| `to`     | string | Recipient WhatsApp number       |
| `type`   | string | Message type                    |

**Example:**

```typescript
const whatsappRequest: WhatsappRequest = {
  from: '1234567890',
  to: '0987654321',
  type: 'text',
  text: 'Hello from WhatsApp!',
}
```

### TelegramRequest

Telegram message request.

```typescript
interface TelegramRequest extends RequestMetadata {
  chatId: string | number
  text: string
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2'
  disableWebPagePreview?: boolean
  disableNotification?: boolean
  customize?: (providerId: string, request: TelegramRequest) => Promise<TelegramRequest>
}
```

**Required Properties:**

| Property | Type             | Description                                |
| -------- | ---------------- | ------------------------------------------ |
| `chatId` | string \| number | Chat, group, or channel identifier         |
| `text`   | string           | Message text (1-4096 characters)           |

**Optional Properties:**

| Property                 | Type                                     | Default | Description                                        |
| ------------------------ | ---------------------------------------- | ------- | -------------------------------------------------- |
| `parseMode`              | 'HTML' \| 'Markdown' \| 'MarkdownV2'     | -       | Text formatting mode                               |
| `disableWebPagePreview`  | boolean                                  | false   | Disable link previews in the message               |
| `disableNotification`    | boolean                                  | false   | Send message silently (no notification sound)      |
| `customize`              | function                                 | -       | Function to customize request per provider         |

**Example:**

```typescript
const telegramRequest: TelegramRequest = {
  chatId: '-1001234567890',
  text: '<b>Hello from Telegram!</b>\n\nThis is a <i>formatted</i> message.',
  parseMode: 'HTML',
  disableNotification: false,
  id: 'msg-123',
  userId: 'user-456',
}
```

**Parse Mode Examples:**

```typescript
// HTML formatting
{
  chatId: '123456',
  text: '<b>Bold</b> <i>Italic</i> <code>Code</code> <a href="https://example.com">Link</a>',
  parseMode: 'HTML'
}

// MarkdownV2 formatting
{
  chatId: '123456',
  text: '*Bold* _Italic_ `Code` [Link](https://example.com)',
  parseMode: 'MarkdownV2'
}

// Plain text (no formatting)
{
  chatId: '123456',
  text: 'Plain text message without any formatting'
}
```

---

## Response Types

### NotificationStatus

Complete notification response.

```typescript
interface NotificationStatus {
  status: 'success' | 'error'
  channels?: Partial<Record<ChannelType, ChannelStatus>>
  errors?: Partial<Record<ChannelType, Error>>
}
```

**Properties:**

| Property   | Type                 | Description                                        |
| ---------- | -------------------- | -------------------------------------------------- |
| `status`   | 'success' \| 'error' | Overall status (success if all channels succeeded) |
| `channels` | object               | Results for successfully sent channels             |
| `errors`   | object               | Errors for failed channels                         |

### SuccessNotificationStatus

Discriminated type for successful notification responses. Narrows `NotificationStatus` to indicate a successful result with the `channels` field always present.

```typescript
interface SuccessNotificationStatus {
  status: 'success'
  channels: Partial<Record<ChannelType, ChannelStatus>>
  errors?: undefined
}
```

**Properties:**

| Property   | Type                                         | Description                                    |
| ---------- | -------------------------------------------- | ---------------------------------------------- |
| `status`   | 'success'                                    | Literal 'success' for successful responses     |
| `channels` | Partial<Record<ChannelType, ChannelStatus>>  | Results for successfully sent channels (always present) |
| `errors`   | undefined                                    | Not present on successful responses            |

### ErrorNotificationStatus

Discriminated type for error notification responses. Narrows `NotificationStatus` to indicate a failed result with the `errors` field always present.

```typescript
interface ErrorNotificationStatus {
  status: 'error'
  channels?: undefined
  errors: Partial<Record<ChannelType, Error>>
}
```

**Properties:**

| Property   | Type                                | Description                              |
| ---------- | ----------------------------------- | ---------------------------------------- |
| `status`   | 'error'                             | Literal 'error' for error responses      |
| `channels` | undefined                           | Not present on error responses           |
| `errors`   | Partial<Record<ChannelType, Error>> | Errors for failed channels (always present) |

### ChannelStatus

Status for a single channel.

```typescript
interface ChannelStatus {
  id: string | undefined
  providerId: string | undefined
}
```

**Properties:**

| Property     | Type                | Description                     |
| ------------ | ------------------- | ------------------------------- |
| `id`         | string \| undefined | Message ID returned by provider |
| `providerId` | string \| undefined | Provider ID that was used       |

### ProviderSendResult

Result from a provider send operation.

```typescript
interface ProviderSendResult {
  id: string
  providerId: string
}
```

---

## Provider Types

### Email Providers

See [PROVIDERS.md - Email](./PROVIDERS.md#email-providers) for complete documentation.

```typescript
type EmailProvider =
  | EmailProviderLogger
  | EmailProviderCustom
  | EmailProviderSendmail
  | EmailProviderSmtp
  | EmailProviderMailgun
  | EmailProviderMandrill
  | EmailProviderSendGrid
  | EmailProviderSes
  | EmailProviderSparkPost
```

### SMS Providers

See [PROVIDERS.md - SMS](./PROVIDERS.md#sms-providers) for complete documentation.

```typescript
type SmsProvider =
  | SmsProviderLogger
  | SmsProviderCustom
  | SmsProvider46elks
  | SmsProviderCallr
  | SmsProviderClickatell
  | SmsProviderInfobip
  | SmsProviderNexmo
  | SmsProviderOvh
  | SmsProviderPlivo
  | SmsProviderTwilio
  | SmsProviderSeven
```

### Push Providers

See [PROVIDERS.md - Push](./PROVIDERS.md#push-providers) for complete documentation.

```typescript
type PushProvider =
  | PushProviderLogger
  | PushProviderCustom
  | PushProviderApn
  | PushProviderFcm
  | PushProviderWns
  | PushProviderAdm
```

### Other Providers

- **Voice**: `VoiceProvider` (Twilio)
- **Webpush**: `WebpushProvider` (GCM)
- **Slack**: `SlackProvider` (Webhook)
- **WhatsApp**: `WhatsappProvider` (Infobip)
- **Telegram**: `TelegramProvider` (Telegram Bot API)

See [PROVIDERS.md](./PROVIDERS.md) for complete provider documentation.

---

## Strategy Types

### StrategyFunction

Function that implements a provider selection strategy.

```typescript
type StrategyFunction<TRequest = unknown> = (
  providers: Provider<TRequest>[]
) => (request: TRequest) => Promise<ProviderSendResult>
```

**Parameters:**

- `providers`: Array of provider instances

**Returns:**

- Function that accepts a request and returns a ProviderSendResult

**Example:**

```typescript
import type { StrategyFunction, Provider } from '@webventures/comms'

const customStrategy: StrategyFunction = (providers) => {
  return async (request) => {
    // Custom provider selection logic
    const selectedProvider = selectProvider(providers, request)

    try {
      const id = await selectedProvider.send(request)
      return { id, providerId: selectedProvider.id }
    } catch (error) {
      error.providerId = selectedProvider.id
      throw error
    }
  }
}
```

### MultiProviderStrategyType

Predefined strategy names.

```typescript
type MultiProviderStrategyType = 'fallback' | 'roundrobin' | 'no-fallback' | 'weighted'
```

**Available Strategies:**

| Strategy       | Description                                                     |
| -------------- | --------------------------------------------------------------- |
| `fallback`     | Try providers in sequence until one succeeds                    |
| `roundrobin`   | Distribute requests evenly across providers in rotation         |
| `no-fallback`  | Use first provider only, fail immediately on error              |
| `weighted`     | Select providers based on probability weights (see custom strategies) |

---

## Error Types

### CommsError

Base error class for all SDK errors.

```typescript
class CommsError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly cause?: unknown
  )

  name: 'CommsError'
  code?: string
  cause?: unknown
}
```

**Example:**

```typescript
try {
  await comms.send({...})
} catch (error) {
  if (error instanceof CommsError) {
    console.error('SDK Error:', error.code, error.message)
    console.error('Cause:', error.cause)
  }
}
```

### ProviderError

Provider-specific error.

```typescript
class ProviderError extends CommsError {
  constructor(
    message: string,
    public readonly providerId: string,
    public readonly channel?: ChannelType,
    code?: string,
    cause?: unknown
  )

  name: 'ProviderError'
  providerId: string
  channel?: ChannelType
}
```

**Example:**

```typescript
try {
  await comms.send({...})
} catch (error) {
  if (error instanceof ProviderError) {
    console.error(`Provider ${error.providerId} failed`)
    console.error(`Channel: ${error.channel}`)
  }
}
```

### ConfigurationError

Configuration-related error.

```typescript
class ConfigurationError extends CommsError {
  name: 'ConfigurationError'
}
```

### ValidationError

Request validation error.

```typescript
class ValidationError extends CommsError {
  constructor(
    message: string,
    public readonly field?: string,
    code?: string,
    cause?: unknown
  )

  name: 'ValidationError'
  field?: string
}
```

### NetworkError

Network/HTTP error.

```typescript
class NetworkError extends CommsError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly response?: unknown,
    code?: string,
    cause?: unknown
  )

  name: 'NetworkError'
  statusCode?: number
  response?: unknown
}
```

---

## Utility Functions

### Response Helpers

#### isSuccessResponse()

```typescript
function isSuccessResponse(status: NotificationStatus): status is SuccessNotificationStatus
```

Type guard to check if response is successful. Returns a type predicate that narrows `NotificationStatus` to `SuccessNotificationStatus`, enabling TypeScript to infer that `channels` is always present within the conditional block.

**Example:**

```typescript
import { isSuccessResponse } from '@webventures/comms'

const result = await comms.send({
  email: {
    from: 'noreply@example.com',
    to: 'user@example.com',
    subject: 'Welcome',
    text: 'Welcome to our platform!',
  },
})

if (isSuccessResponse(result)) {
  // TypeScript knows result is SuccessNotificationStatus
  // result.channels is guaranteed to be present (not optional)
  console.log('All channels succeeded')
  console.log('Email ID:', result.channels.email?.id)

  // No need to check if channels exists - TypeScript knows it's defined
  for (const [channel, status] of Object.entries(result.channels)) {
    console.log(`${channel}: ${status?.id}`)
  }
}
```

**Type Narrowing Benefit:**

```typescript
// Before (without type predicate) - TypeScript doesn't narrow the type
if (result.status === 'success') {
  // result.channels is still optional: Partial<Record<...>> | undefined
  console.log(result.channels?.email?.id) // Must use optional chaining
}

// After (with type predicate) - TypeScript narrows to SuccessNotificationStatus
if (isSuccessResponse(result)) {
  // result.channels is guaranteed: Partial<Record<...>>
  console.log(result.channels.email?.id) // No optional chaining needed for channels
}
```

#### isErrorResponse()

```typescript
function isErrorResponse(status: NotificationStatus): status is ErrorNotificationStatus
```

Type guard to check if response has errors. Returns a type predicate that narrows `NotificationStatus` to `ErrorNotificationStatus`, enabling TypeScript to infer that `errors` is always present within the conditional block.

**Example:**

```typescript
import { isErrorResponse, getErrors } from '@webventures/comms'

const result = await comms.send({
  email: {
    from: 'noreply@example.com',
    to: 'user@example.com',
    subject: 'Welcome',
    text: 'Welcome to our platform!',
  },
})

if (isErrorResponse(result)) {
  // TypeScript knows result is ErrorNotificationStatus
  // result.errors is guaranteed to be present (not optional)
  console.error('Some channels failed')

  // No need to check if errors exists - TypeScript knows it's defined
  for (const [channel, error] of Object.entries(result.errors)) {
    console.error(`${channel} failed: ${error?.message}`)
  }
}
```

**Type Narrowing Benefit:**

```typescript
// Before (without type predicate) - TypeScript doesn't narrow the type
if (result.status === 'error') {
  // result.errors is still optional: Partial<Record<...>> | undefined
  if (result.errors) { // Must check explicitly
    console.error(result.errors.email?.message)
  }
}

// After (with type predicate) - TypeScript narrows to ErrorNotificationStatus
if (isErrorResponse(result)) {
  // result.errors is guaranteed: Partial<Record<...>>
  console.error(result.errors.email?.message) // No need to check if errors exists
}
```

#### getErrors()

```typescript
function getErrors(status: NotificationStatus): Error[]
```

Extract all errors from response.

**Example:**

```typescript
const result = await comms.send({...})
const errors = getErrors(result)
errors.forEach(err => console.error(err.message))
```

#### getChannelIds()

```typescript
function getChannelIds(status: NotificationStatus): Partial<Record<ChannelType, string>>
```

Extract message IDs from successful channels.

**Example:**

```typescript
const result = await comms.send({...})
const ids = getChannelIds(result)
console.log('Email ID:', ids.email)
console.log('SMS ID:', ids.sms)
```

### Error Helpers

#### isCommsError()

```typescript
function isCommsError(error: unknown): error is CommsError
```

Type guard for CommsError.

#### isProviderError()

```typescript
function isProviderError(error: unknown): error is ProviderError
```

Type guard for ProviderError.

### Environment Helpers

#### detectEnvironment()

```typescript
function detectEnvironment(): EnvironmentConfig
```

Detect current runtime environment.

**Example:**

```typescript
import { detectEnvironment } from '@webventures/comms'

const env = detectEnvironment()
console.log('Is Next.js:', env.isNextJS)
console.log('Is React Native:', env.isReactNative)
console.log('Is SSR:', env.isSSR)
```

---

## Constants

### CHANNELS

Available notification channels.

```typescript
const CHANNELS = {
  email: 'email',
  push: 'push',
  sms: 'sms',
  voice: 'voice',
  webpush: 'webpush',
  slack: 'slack',
  whatsapp: 'whatsapp',
} as const
```

**Example:**

```typescript
import CommsSdk, { CHANNELS } from '@webventures/comms'

console.log(CHANNELS.email) // 'email'
console.log(CHANNELS.sms) // 'sms'
```

---

## Type Aliases

### ChannelType

Union type of all channel names.

```typescript
type ChannelType = 'email' | 'sms' | 'push' | 'voice' | 'webpush' | 'slack' | 'whatsapp' | 'telegram'
```

### NotificationStatusType

Notification status values.

```typescript
type NotificationStatusType = 'success' | 'error'
```

### Provider

Base provider interface.

```typescript
interface Provider<TRequest = unknown> {
  id: string
  send(request: TRequest): Promise<string>
}
```

### LoggerInstance

Logger interface (Winston-compatible).

```typescript
interface LoggerInstance {
  error(message: string, ...meta: unknown[]): void
  warn(message: string, ...meta: unknown[]): void
  info(message: string, ...meta: unknown[]): void
  debug(message: string, ...meta: unknown[]): void
  mute(): void
  configure(transports: unknown[]): void
}
```

---

## Advanced Types

### DeepPartial

Makes all properties in type T optional recursively.

```typescript
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}
```

### RequireAtLeastOne

Requires at least one property from Keys to be present.

```typescript
type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
  }[Keys]
```

---

## See Also

- [Main Documentation](./README.md)
- [Provider Configuration](./PROVIDERS.md)
- [Framework Integration](./FRAMEWORKS.md)
- [Code Examples](./EXAMPLES.md)
