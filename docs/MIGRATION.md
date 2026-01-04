# Migration Guide: v1.x to v2.0.0

Complete guide for migrating from WebVentures Comms SDK v1.x to v2.0.0.

## Table of Contents

- [Overview](#overview)
- [Breaking Changes](#breaking-changes)
- [New Features](#new-features)
- [Migration Steps](#migration-steps)
- [Provider Changes](#provider-changes)
- [Type System Changes](#type-system-changes)
- [Configuration Changes](#configuration-changes)
- [API Changes](#api-changes)
- [Deprecated APIs](#deprecated-apis)
- [Migration Examples](#migration-examples)

---

## Overview

WebVentures Comms SDK v2.0.0 is a major rewrite in TypeScript with full type safety, modern framework support, and improved developer experience. While the core concepts remain the same, there are several breaking changes to be aware of.

### Key Improvements in v2.0.0

- Full TypeScript rewrite with comprehensive type definitions
- Next.js 16+, React 19, React Native, and Expo support
- Modern module system (ESM + CommonJS)
- Improved error handling with custom error classes
- Better provider configuration types
- Enhanced strategy system
- Reduced bundle size
- Updated dependencies

---

## Breaking Changes

### 1. Module System

**v1.x:**

```javascript
const CommsSdk = require('webventures-comms')
```

**v2.0.0:**

```typescript
// ESM (recommended)
import CommsSdk from '@webventures/comms'

// CommonJS (still supported)
const CommsSdk = require('@webventures/comms').default
```

### 2. Package Name

**v1.x:**

```bash
npm install webventures-comms
```

**v2.0.0:**

```bash
npm install @webventures/comms
```

### 3. TypeScript is Required

v2.0.0 is written in TypeScript and requires TypeScript 5.0+ for best experience. JavaScript users can still use the package, but will miss out on type checking benefits.

### 4. Node.js Version

**v1.x:** Node.js 8+

**v2.0.0:** Node.js 18+

### 5. Configuration Structure

Provider configurations are now fully typed and validated.

**v1.x:**

```javascript
new CommsSdk({
  channels: {
    email: {
      providers: [
        {
          type: 'smtp',
          host: 'smtp.example.com',
          port: 587,
          auth: {
            user: 'user',
            pass: 'pass',
          },
        },
      ],
    },
  },
})
```

**v2.0.0** (same structure, but with TypeScript types):

```typescript
import CommsSdk, { type CommsSdkConfig } from '@webventures/comms'

const config: CommsSdkConfig = {
  channels: {
    email: {
      providers: [
        {
          type: 'smtp',
          host: 'smtp.example.com',
          port: 587,
          auth: {
            user: 'user',
            pass: 'pass',
          },
        },
      ],
    },
  },
}

const comms = new CommsSdk(config)
```

### 6. Custom Provider Interface

**v1.x:**

```javascript
{
  type: 'custom',
  id: 'my-provider',
  send: (request) => {
    return new Promise((resolve) => {
      // Implementation
      resolve('message-id')
    })
  }
}
```

**v2.0.0:**

```typescript
import type { EmailRequest } from '@webventures/comms'

{
  type: 'custom',
  id: 'my-provider',
  send: async (request: EmailRequest): Promise<string> => {
    // Implementation with proper typing
    const result = await sendEmail(request)
    return result.messageId
  }
}
```

### 7. Error Handling

**v1.x:**

```javascript
const result = await comms.send({...})
if (result.status === 'error') {
  console.error(result.errors)
}
```

**v2.0.0** (enhanced with error classes):

```typescript
import { isProviderError, isCommsError } from '@webventures/comms'

try {
  const result = await comms.send({...})
  if (result.status === 'error') {
    console.error(result.errors)
  }
} catch (error) {
  if (isProviderError(error)) {
    console.error(`Provider ${error.providerId} failed:`, error.message)
  } else if (isCommsError(error)) {
    console.error('SDK error:', error.code, error.message)
  }
}
```

### 8. Strategy Functions

**v1.x:**

```javascript
const customStrategy = (providers) => (request) => {
  // Implementation
}
```

**v2.0.0** (typed):

```typescript
import type { StrategyFunction, Provider, ProviderSendResult } from '@webventures/comms'

const customStrategy: StrategyFunction = (providers: Provider[]) => {
  return async (request): Promise<ProviderSendResult> => {
    // Implementation with types
  }
}
```

---

## New Features

### 1. Framework Adapters

v2.0.0 introduces framework-specific adapters:

```typescript
// Next.js 16+
import { createNextJSComms, withComms } from '@webventures/comms/adapters'

// React Native
import { createReactNativeComms } from '@webventures/comms/adapters'

// Expo
import { createExpoComms } from '@webventures/comms/adapters'

// Node.js with env config
import { createNodeCommsFromEnv } from '@webventures/comms/adapters'
```

### 2. Enhanced Type System

All types are now exported for use in your application:

```typescript
import type {
  EmailRequest,
  SmsRequest,
  PushRequest,
  NotificationStatus,
  EmailProvider,
  SmsProvider,
  StrategyFunction,
} from '@webventures/comms'
```

### 3. Error Classes

New error classes for better error handling:

```typescript
import {
  CommsError,
  ProviderError,
  ConfigurationError,
  ValidationError,
  NetworkError,
} from '@webventures/comms'
```

### 4. Helper Functions

New utility functions:

```typescript
import {
  isSuccessResponse,
  isErrorResponse,
  getErrors,
  getChannelIds,
  detectEnvironment
} from '@webventures/comms'

const result = await comms.send({...})

if (isSuccessResponse(result)) {
  const ids = getChannelIds(result)
  console.log('Email ID:', ids.email)
}
```

### 5. Environment Detection

```typescript
import { detectEnvironment } from '@webventures/comms'

const env = detectEnvironment()
console.log('Is Next.js:', env.isNextJS)
console.log('Is React Native:', env.isReactNative)
console.log('Is SSR:', env.isSSR)
```

---

## Migration Steps

### Step 1: Update Dependencies

```bash
# Remove old package
npm uninstall webventures-comms

# Install new package
npm install @webventures/comms

# If using TypeScript
npm install --save-dev typescript@^5.0.0
```

### Step 2: Update Imports

**Before:**

```javascript
const CommsSdk = require('webventures-comms')
```

**After:**

```typescript
import CommsSdk from '@webventures/comms'
// or
const CommsSdk = require('@webventures/comms').default
```

### Step 3: Add Type Annotations (if using TypeScript)

```typescript
import CommsSdk, { type CommsSdkConfig, type NotificationRequest } from '@webventures/comms'

const config: CommsSdkConfig = {
  // Your configuration
}

const comms = new CommsSdk(config)

const request: NotificationRequest = {
  email: {
    from: 'noreply@example.com',
    to: 'user@example.com',
    subject: 'Hello',
    text: 'World',
  },
}

const result = await comms.send(request)
```

### Step 4: Update Custom Providers

```typescript
// Before (v1.x)
{
  type: 'custom',
  id: 'my-provider',
  send: (request) => Promise.resolve('id')
}

// After (v2.0.0)
import type { EmailRequest } from '@webventures/comms'

{
  type: 'custom',
  id: 'my-provider',
  send: async (request: EmailRequest): Promise<string> => {
    // Your implementation
    return 'message-id'
  }
}
```

### Step 5: Update Error Handling

```typescript
// Before (v1.x)
const result = await comms.send({...})
if (result.status === 'error') {
  console.error(result.errors)
}

// After (v2.0.0) - Enhanced
import { isProviderError, getErrors } from '@webventures/comms'

const result = await comms.send({...})
if (result.status === 'error') {
  const errors = getErrors(result)
  errors.forEach(err => {
    if (isProviderError(err)) {
      console.error(`Provider ${err.providerId} failed:`, err.message)
    }
  })
}
```

### Step 6: Update Strategy Functions (if using custom strategies)

```typescript
// Before (v1.x)
const customStrategy = (providers) => async (request) => {
  const provider = providers[0]
  const id = await provider.send(request)
  return { id, providerId: provider.id }
}

// After (v2.0.0) - With types
import type { StrategyFunction } from '@webventures/comms'

const customStrategy: StrategyFunction = (providers) => {
  return async (request) => {
    const provider = providers[0]
    if (!provider) throw new Error('No provider available')

    const id = await provider.send(request)
    return { id, providerId: provider.id }
  }
}
```

---

## Provider Changes

### No Breaking Changes in Provider Configs

All provider configurations from v1.x are compatible with v2.0.0. However, they now have proper TypeScript types.

### Updated Provider Types

```typescript
// Email providers
import type {
  EmailProviderSmtp,
  EmailProviderSendGrid,
  EmailProviderSes,
  EmailProviderMailgun,
  EmailProviderMandrill,
  EmailProviderSparkPost,
  EmailProviderSendmail,
} from '@webventures/comms'

// SMS providers
import type {
  SmsProviderTwilio,
  SmsProviderNexmo,
  SmsProviderPlivo,
  // ... etc
} from '@webventures/comms'
```

---

## Type System Changes

### Request Types

**v1.x:** No types, only documentation

**v2.0.0:** Full TypeScript types

```typescript
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
```

### Response Types

```typescript
import type {
  NotificationStatus,
  ChannelStatus,
  NotificationStatusType
} from '@webventures/comms'

const result: NotificationStatus = await comms.send({...})
```

### Provider Types

```typescript
import type {
  EmailProvider,
  SmsProvider,
  PushProvider,
  VoiceProvider,
  WebpushProvider,
  SlackProvider,
  WhatsappProvider,
} from '@webventures/comms'
```

---

## Configuration Changes

### Channel Configuration

No breaking changes, but now with types:

```typescript
import type { ChannelConfig } from '@webventures/comms'

const emailChannel: ChannelConfig = {
  providers: [
    {
      type: 'sendgrid',
      apiKey: process.env.SENDGRID_API_KEY!,
    },
  ],
  multiProviderStrategy: 'fallback',
}
```

### Environment Variables

Same as v1.x:

```bash
COMMS_HTTP_PROXY=http://proxy.example.com:8080
COMMS_CATCHER_OPTIONS=smtp://localhost:1025
```

---

## API Changes

### SDK Class

**No breaking changes** - All methods remain the same:

```typescript
const comms = new CommsSdk(config)
await comms.send(request)
comms.logger.mute()
comms.logger.configure([...])
```

### Response Format

**No changes** - Response format is identical:

```typescript
{
  status: 'success' | 'error',
  channels?: {
    [channel]: {
      id: string | undefined,
      providerId: string | undefined
    }
  },
  errors?: {
    [channel]: Error
  }
}
```

---

## Deprecated APIs

### Type Aliases

Some type aliases are deprecated but still available:

```typescript
// Deprecated (still works)
import type { EmailRequestType } from '@webventures/comms'

// Use instead
import type { EmailRequest } from '@webventures/comms'
```

**Deprecated types:**

- `EmailRequestType` → use `EmailRequest`
- `SmsRequestType` → use `SmsRequest`
- `PushRequestType` → use `PushRequest`
- `EmailProviderType` → use `EmailProvider`
- `SmsProviderType` → use `SmsProvider`

These will be removed in v3.0.0.

---

## Migration Examples

### Example 1: Basic Email Sending

**v1.x:**

```javascript
const CommsSdk = require('webventures-comms')

const comms = new CommsSdk({
  channels: {
    email: {
      providers: [
        {
          type: 'smtp',
          host: 'smtp.example.com',
          port: 587,
          auth: { user: 'user', pass: 'pass' },
        },
      ],
    },
  },
})

comms
  .send({
    email: {
      from: 'noreply@example.com',
      to: 'user@example.com',
      subject: 'Hello',
      text: 'World',
    },
  })
  .then(console.log)
```

**v2.0.0:**

```typescript
import CommsSdk from '@webventures/comms'

const comms = new CommsSdk({
  channels: {
    email: {
      providers: [
        {
          type: 'smtp',
          host: 'smtp.example.com',
          port: 587,
          auth: { user: 'user', pass: 'pass' },
        },
      ],
    },
  },
})

const result = await comms.send({
  email: {
    from: 'noreply@example.com',
    to: 'user@example.com',
    subject: 'Hello',
    text: 'World',
  },
})

console.log(result)
```

### Example 2: Multi-Provider with Fallback

**v1.x:**

```javascript
const CommsSdk = require('webventures-comms')

new CommsSdk({
  channels: {
    email: {
      multiProviderStrategy: 'fallback',
      providers: [
        { type: 'sendgrid', apiKey: 'key1' },
        { type: 'mailgun', apiKey: 'key2', domainName: 'example.com' },
      ],
    },
  },
})
```

**v2.0.0** (identical):

```typescript
import CommsSdk from '@webventures/comms'

new CommsSdk({
  channels: {
    email: {
      multiProviderStrategy: 'fallback',
      providers: [
        { type: 'sendgrid', apiKey: 'key1' },
        { type: 'mailgun', apiKey: 'key2', domainName: 'example.com' },
      ],
    },
  },
})
```

### Example 3: Custom Strategy

**v1.x:**

```javascript
const customStrategy = (providers) => async (request) => {
  const provider = providers[Math.floor(Math.random() * providers.length)]
  try {
    const id = await provider.send(request)
    return { id, providerId: provider.id }
  } catch (error) {
    error.providerId = provider.id
    throw error
  }
}
```

**v2.0.0:**

```typescript
import type { StrategyFunction } from '@webventures/comms'

const customStrategy: StrategyFunction = (providers) => {
  return async (request) => {
    const provider = providers[Math.floor(Math.random() * providers.length)]
    if (!provider) throw new Error('No providers available')

    try {
      const id = await provider.send(request)
      return { id, providerId: provider.id }
    } catch (error) {
      if (error instanceof Error) {
        ;(error as Error & { providerId?: string }).providerId = provider.id
      }
      throw error
    }
  }
}
```

### Example 4: Custom Provider

**v1.x:**

```javascript
{
  type: 'custom',
  id: 'my-email-service',
  send: (request) => {
    return myEmailService.send(request)
      .then(response => response.id)
  }
}
```

**v2.0.0:**

```typescript
import type { EmailRequest } from '@webventures/comms'

{
  type: 'custom',
  id: 'my-email-service',
  send: async (request: EmailRequest): Promise<string> => {
    const response = await myEmailService.send(request)
    return response.id
  }
}
```

---

## Testing Your Migration

### 1. Unit Tests

Update your test mocks:

```typescript
import { vi } from 'vitest'
import type { NotificationStatus } from '@webventures/comms'

const mockResult: NotificationStatus = {
  status: 'success',
  channels: {
    email: {
      id: 'test-id',
      providerId: 'test-provider',
    },
  },
}

vi.mock('@webventures/comms', () => ({
  default: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue(mockResult),
  })),
}))
```

### 2. Integration Tests

Test with notification catcher:

```typescript
import CommsSdk from '@webventures/comms'

const comms = new CommsSdk({
  useNotificationCatcher: true,
})

// Run tests against localhost:1080
```

### 3. Type Checking

```bash
# Verify TypeScript compilation
npx tsc --noEmit
```

---

## FAQ

**Q: Do I need to change my provider configurations?**

A: No, all v1.x provider configurations work in v2.0.0.

**Q: Will my custom providers still work?**

A: Yes, but you should add TypeScript types for better type safety.

**Q: Can I use v2.0.0 with JavaScript?**

A: Yes, but you'll miss out on type checking benefits.

**Q: Is the notification catcher still supported?**

A: Yes, it works exactly the same way.

**Q: What about the response format?**

A: No changes - responses are identical to v1.x.

**Q: Are there any performance improvements?**

A: Yes, v2.0.0 has reduced bundle size and optimized dependencies.

---

## Getting Help

If you encounter issues during migration:

1. Check the [API documentation](./API.md)
2. Review [examples](./EXAMPLES.md)
3. Search [GitHub issues](https://github.com/CryptVenture/Comms/issues)
4. Ask on [GitHub Discussions](https://github.com/CryptVenture/Comms/discussions)

---

## See Also

- [Main Documentation](./README.md)
- [API Reference](./API.md)
- [Provider Configuration](./PROVIDERS.md)
- [Framework Integration](./FRAMEWORKS.md)
- [Examples](./EXAMPLES.md)
