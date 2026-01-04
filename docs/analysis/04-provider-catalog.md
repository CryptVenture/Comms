# Provider Catalog

## Email Providers (8)

### 1. SMTP (`src/providers/email/smtp.js`)

**Used for**: Generic email sending via SMTP
**Dependencies**: `nodemailer`
**Config**:

```typescript
{
  type: 'smtp',
  host: string,
  port: number,
  secure: boolean,
  auth: {
    user: string,
    pass: string
  }
}
```

**Upgrade Plan**: Keep nodemailer, update to v6.9.16+

### 2. Sendgrid (`src/providers/email/sendgrid.js`)

**Used for**: Sendgrid cloud email service
**Dependencies**: Custom HTTP client
**Config**: `{type: 'sendgrid', apiKey: string}`
**Upgrade Plan**: Consider using `@sendgrid/mail` SDK

### 3. AWS SES (`src/providers/email/ses.js`)

**Used for**: Amazon Simple Email Service
**Dependencies**: Custom AWS Signature V4
**Config**:

```typescript
{
  type: 'ses',
  region: string,
  accessKeyId: string,
  secretAccessKey: string,
  sessionToken?: string
}
```

**Upgrade Plan**: Use `@aws-sdk/client-ses` v3.x

### 4. Mailgun (`src/providers/email/mailgun.js`)

**Used for**: Mailgun email service
**Dependencies**: Custom HTTP client, form-data
**Config**: `{type: 'mailgun', apiKey: string, domainName: string}`
**Upgrade Plan**: Consider using `mailgun.js` SDK

### 5. Mandrill (`src/providers/email/mandrill.js`)

**Used for**: Mailchimp Mandrill service
**Dependencies**: Custom HTTP client
**Config**: `{type: 'mandrill', apiKey: string}`
**Upgrade Plan**: Keep custom implementation

### 6. SparkPost (`src/providers/email/sparkpost.js`)

**Used for**: SparkPost email service
**Dependencies**: Custom HTTP client
**Config**: `{type: 'sparkpost', apiKey: string}`
**Upgrade Plan**: Keep custom implementation

### 7. Sendmail (`src/providers/email/sendmail.js`)

**Used for**: Local sendmail binary
**Dependencies**: `nodemailer`
**Config**: `{type: 'sendmail', sendmail: true, newline: 'unix', path: string}`
**Upgrade Plan**: Keep, update nodemailer

### 8. Notification Catcher (`src/providers/email/notificationCatcher.js`)

**Used for**: Development/testing
**Dependencies**: `nodemailer`
**Config**: Auto-configured
**Upgrade Plan**: Keep for development

## SMS Providers (10)

### 1. Twilio (`src/providers/sms/twilio.js`)

**Market Share**: Leading SMS provider
**Config**: `{type: 'twilio', accountSid: string, authToken: string}`
**Upgrade Plan**: Consider using `twilio` SDK v5.x

### 2. Nexmo/Vonage (`src/providers/sms/nexmo.js`)

**Market Share**: Major SMS provider
**Config**: `{type: 'nexmo', apiKey: string, apiSecret: string}`
**Upgrade Plan**: Use `@vonage/server-sdk` v3.x

### 3. Plivo (`src/providers/sms/plivo.js`)

**Market Share**: Growing SMS provider
**Config**: `{type: 'plivo', authId: string, authToken: string}`
**Upgrade Plan**: Consider using `plivo` SDK v4.x

### 4. Infobip (`src/providers/sms/infobip.js`)

**Market Share**: Global CPaaS platform
**Config**: `{type: 'infobip', username: string, password: string}`
**Upgrade Plan**: Keep custom implementation

### 5. OVH (`src/providers/sms/ovh.js`)

**Market Share**: European provider
**Config**:

```typescript
{
  type: 'ovh',
  appKey: string,
  appSecret: string,
  consumerKey: string,
  account: string,
  host: string
}
```

**Upgrade Plan**: Use `ovh` SDK v3.x

### 6. Callr (`src/providers/sms/callr.js`)

**Market Share**: European SMS provider
**Config**: `{type: 'callr', login: string, password: string}`
**Upgrade Plan**: Keep custom implementation

### 7. Clickatell (`src/providers/sms/clickatell.js`)

**Market Share**: International SMS provider
**Config**: `{type: 'clickatell', apiKey: string}`
**Upgrade Plan**: Keep custom implementation

### 8. 46elks (`src/providers/sms/46elks.js`)

**Market Share**: Nordic SMS provider
**Config**: `{type: '46elks', apiUsername: string, apiPassword: string}`
**Upgrade Plan**: Keep custom implementation

### 9. Seven (`src/providers/sms/seven.js`)

**Market Share**: European SMS provider
**Config**: `{type: 'seven', apiKey: string}`
**Upgrade Plan**: Keep custom implementation

### 10. Notification Catcher

**Used for**: Development/testing
**Upgrade Plan**: Keep for development

## Push Notification Providers (4)

### 1. FCM - Firebase Cloud Messaging (`src/providers/push/fcm.js`)

**Platform**: Android, iOS, Web
**Dependencies**: `node-pushnotifications`
**Config**: `{type: 'fcm', id: string}`
**Upgrade Plan**: Use `firebase-admin` SDK v13.x

### 2. APN - Apple Push Notification (`src/providers/push/apn.js`)

**Platform**: iOS, macOS
**Dependencies**: `node-pushnotifications`
**Config**:

```typescript
{
  type: 'apn',
  token: {
    key: string,
    keyId: string,
    teamId: string
  }
}
```

**Upgrade Plan**: Use `@parse/node-apn` v6.x or `apn` v3.x

### 3. WNS - Windows Push Notification (`src/providers/push/wns.js`)

**Platform**: Windows
**Dependencies**: `node-pushnotifications`
**Config**:

```typescript
{
  type: 'wns',
  clientId: string,
  clientSecret: string,
  notificationMethod: string
}
```

**Upgrade Plan**: Keep, update `node-pushnotifications`

### 4. ADM - Amazon Device Messaging (`src/providers/push/adm.js`)

**Platform**: Amazon devices
**Dependencies**: `node-pushnotifications`
**Config**: `{type: 'adm', clientId: string, clientSecret: string}`
**Upgrade Plan**: Keep, update `node-pushnotifications`

## Web Push Providers (1)

### 1. GCM (`src/providers/webpush/gcm.js`)

**Standard**: W3C Web Push Protocol
**Dependencies**: `web-push`
**Config**:

```typescript
{
  type: 'gcm',
  gcmAPIKey: string,
  vapidDetails: {
    subject: string,
    publicKey: string,
    privateKey: string
  }
}
```

**Upgrade Plan**: Update `web-push` to v3.7.0

## Voice Providers (1)

### 1. Twilio (`src/providers/voice/twilio.js`)

**Used for**: Voice calls
**Dependencies**: Custom HTTP client
**Config**: `{type: 'twilio', accountSid: string, authToken: string}`
**Upgrade Plan**: Consider using `twilio` SDK

## Slack Providers (1)

### 1. Webhook (`src/providers/slack/slack.js`)

**Used for**: Slack incoming webhooks
**Dependencies**: Custom HTTP client
**Config**: `{type: 'webhook', webhookUrl: string}`
**Upgrade Plan**: Keep custom implementation

## WhatsApp Providers (1)

### 1. Infobip (`src/providers/whatsapp/infobip.js`)

**Used for**: WhatsApp Business API via Infobip
**Dependencies**: Custom HTTP client
**Config**: Infobip credentials
**Upgrade Plan**: Keep custom implementation

## Logger Provider (Development)

### Logger (`src/providers/logger.js`)

**Used for**: Development logging to console
**Channel**: All channels
**Config**: `{type: 'logger'}`
**Upgrade Plan**: Keep, enhance with better formatting

## Provider Implementation Checklist

For each provider during TypeScript migration:

- [ ] Create TypeScript interface for config
- [ ] Add config validation
- [ ] Add proper error types
- [ ] Add JSDoc comments
- [ ] Update dependencies if needed
- [ ] Add/update tests
- [ ] Add provider-specific types for requests
- [ ] Ensure proper error handling
- [ ] Add retry logic where appropriate
- [ ] Document rate limits
- [ ] Add examples

## Provider Priority for Migration

### Phase 1: High-Priority (Most Popular)

1. Email: SMTP, Sendgrid, SES
2. SMS: Twilio, Nexmo
3. Push: FCM, APN
4. Logger (development)

### Phase 2: Medium-Priority

1. Email: Mailgun, Mandrill
2. SMS: Plivo, Infobip
3. Push: WNS
4. Webpush: GCM
5. Voice: Twilio

### Phase 3: Low-Priority (Niche)

1. Email: SparkPost, Sendmail
2. SMS: OVH, Callr, Clickatell, 46elks, Seven
3. Push: ADM
4. Slack: Webhook
5. WhatsApp: Infobip
