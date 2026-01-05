# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WebVentures Comms SDK is a unified communication SDK that provides a type-safe interface for sending transactional notifications across multiple channels (email, SMS, push, voice, webpush, Slack, WhatsApp) using various providers. The SDK features intelligent multi-provider failover strategies and is optimized for Next.js 16+, React 19, React Native, and Expo.

**Key characteristics:**

- Dual ESM/CJS packaging with tree-shakeable exports
- Provider abstraction with pluggable strategies (fallback, round-robin, no-fallback)
- Channel-specific request validation and transformation
- Type-safe API with comprehensive TypeScript definitions

## Development Commands

### Build & Test

```bash
# Build the package (CJS + ESM)
pnpm run build

# Type checking only
pnpm run type-check

# Lint code
pnpm run lint
pnpm run lint:fix

# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with UI
pnpm test:ui

# Run tests with coverage
pnpm test:coverage

# Run a specific test file
pnpm test __tests__/providers/email/sendgrid.test.ts

# Clean build artifacts
pnpm run clean
```

### Development & Testing

```bash
# Run example with notification-catcher (local email/SMS testing)
pnpm run dev

# Run demo (starts notification-catcher and runs example)
pnpm run demo
# Visit http://localhost:1080 to view caught notifications

# Check bundle size
pnpm run size
```

## Architecture

### Core Components

**1. CommsSdk (src/index.ts)**

- Main entry point and public API
- Instantiates providers and strategies based on configuration
- Delegates to `Sender` for actual notification dispatch

**2. Sender (src/sender.ts)**

- Orchestrates multi-channel notification sending
- Applies channel-specific strategies (fallback, round-robin, no-fallback)
- Handles parallel channel execution and result aggregation
- Manages provider selection and error handling

**3. Provider System**

```
src/providers/
├── email/          # Email providers (SendGrid, SES, Mailgun, etc.)
├── sms/            # SMS providers (Twilio, Vonage, Plivo, etc.)
├── push/           # Push notification providers (FCM, APNs)
├── voice/          # Voice providers (Twilio Voice)
├── webpush/        # Web push providers
├── slack/          # Slack providers
├── whatsapp/       # WhatsApp providers
├── index.ts        # Provider factory
└── logger.ts       # Provider request/response logging
```

Each provider implements the `Provider` interface with:

- `send(request)` - Sends notification and returns `ProviderSendResult`
- Type-specific request validation
- HTTP client abstraction via `src/util/request.ts`

**4. Strategy System (src/strategies/providers/)**

- **Fallback**: Try providers sequentially until one succeeds
- **Round-robin**: Distribute load across providers in rotation
- **No-fallback**: Use only the first provider (fail fast)

Strategies are factory functions: `(providers: Provider[]) => (request) => Promise<ProviderSendResult>`

**5. Type System (src/types/ and src/models/)**

- `CommsSdkConfig`: SDK configuration with channel/provider settings
- `NotificationRequest`: Multi-channel request type
- `NotificationStatus`: Unified response with per-channel results
- Provider-specific types in `src/models/provider-*.ts`

### Data Flow

```
User Request
    ↓
CommsSdk.send(request)
    ↓
Sender.send(request)
    ↓
[Per Channel in Parallel]
    ↓
Strategy(providers)(channelRequest)
    ↓
Provider.send(channelRequest)
    ↓
HTTP Request via src/util/request.ts
    ↓
Provider-specific API
```

### Package Exports

The package uses fine-grained exports for tree-shaking (see tsup.config.ts):

- Main: `@webventures/comms`
- Providers: `@webventures/comms/providers/{email,sms,push,voice,webpush,slack,whatsapp}`
- Strategies: `@webventures/comms/strategies/{fallback,roundrobin,no-fallback}`

## Testing Infrastructure

### Test Setup (**tests**/setup.ts)

**Critical Vitest 4.x Compatibility:**
The test setup includes a custom `toHaveBeenLastCalledWith` matcher that transforms HTTP request arguments before comparison. This is necessary because:

1. The SDK uses `undici` for HTTP requests with URL/options format
2. Tests expect transformed arguments (hostname, protocol, path, headers as arrays)
3. Vitest 4.x made `mock` property non-configurable, preventing Proxy wrapping
4. Solution: Custom matcher transforms `mock.lastCall` during assertion

**Mock HTTP Client:**

- `mockRequest` is a `vi.fn()` that captures request details and returns mocked responses
- `mockResponse(statusCode, body)` queues responses for subsequent requests
- `mockHttp` proxy provides access to captured request body via `.body` property
- All tests use `mockHttp` instead of the real HTTP client

### Writing Tests

```typescript
import { vi, test, expect } from 'vitest'
import CommsSdk from '../../../src'
import { mockHttp, mockResponse } from '../mockHttp.test'

test('Provider success test', async () => {
  mockResponse(200, JSON.stringify({ id: 'test-id' }))

  const sdk = new CommsSdk({
    channels: {
      email: { providers: [{ type: 'sendgrid', apiKey: 'key' }] },
    },
  })

  const result = await sdk.send({
    email: { to: 'test@example.com', subject: 'Test', text: 'Hello' },
  })

  // mockHttp automatically transforms call arguments
  expect(mockHttp).toHaveBeenLastCalledWith(
    expect.objectContaining({
      hostname: 'api.sendgrid.com',
      method: 'POST',
      headers: expect.objectContaining({
        'User-Agent': ['webventures-comms/v2 (+https://github.com/cryptventure/comms)'],
      }),
    })
  )

  expect(result).toEqual({
    status: 'success',
    channels: { email: { id: 'test-id', providerId: 'email-sendgrid-provider' } },
  })
})
```

### Test Organization

- Provider tests: `__tests__/providers/{channel}/{provider}.test.ts`
- Strategy tests: `__tests__/strategies/providers/{strategy}.test.ts`
- Integration tests: `__tests__/comms-sdk.test.ts`
- Each provider test file should include a "not a test" placeholder test to prevent empty suites

## Framework Adapters

### Next.js Adapter (src/adapters/nextjs.ts)

Provides server-side only helpers:

- `createNextJSComms(config)` - Creates SDK instance with server-side validation
- `withComms(handler, config)` - HOC that injects SDK instance into handler
- Throws error if used in client-side code (checks for `window` global)

## Provider Implementation Guide

When adding a new provider:

1. Create provider file in `src/providers/{channel}/{name}.ts`
2. Implement the `Provider` interface:

   ```typescript
   export default class NewProvider implements Provider {
     id = '{channel}-{name}-provider'

     constructor(config: ProviderConfig) {
       // Validate and store config
     }

     async send(request: ChannelRequest): Promise<ProviderSendResult> {
       // Transform request to provider format
       // Make HTTP request via src/util/request.ts
       // Return { id: string } or throw error
     }
   }
   ```

3. Update `src/providers/{channel}/index.ts` to export the provider
4. Update `src/models/provider-{channel}.ts` with provider config type
5. Add comprehensive tests in `__tests__/providers/{channel}/{name}.test.ts`
6. Update README.md with provider documentation

## Important Patterns

### Error Handling

- Use `ProviderError` (src/types/errors.ts) for provider failures
- Include `statusCode` and `url` in errors when available
- Sender catches provider errors and includes them in `NotificationStatus.errors`

### User-Agent Headers

All HTTP providers must include:

```typescript
'User-Agent': 'webventures-comms/v2 (+https://github.com/cryptventure/comms)'
```

### Request Transformation

- Providers receive channel-specific requests (EmailRequest, SmsRequest, etc.)
- Use `customize` function if provided in request to allow per-request provider overrides
- Transform to provider API format within each provider's `send()` method

### Logging

- Use `src/util/logger.ts` for SDK-level logging (info, warn, error)
- Use `src/providers/logger.ts` (ProviderLogger) for request/response logging with provider context

## Build System

**tsup (tsup.config.ts):**

- Builds both CJS and ESM formats
- Generates TypeScript declarations (.d.ts and .d.mts)
- Creates separate entry points for tree-shaking
- Externalizes peer dependencies (nodemailer, winston, etc.)
- Target: ES2022, Node.js 18+

**Package Validation:**

- `publint` - Validates package.json exports
- `@arethetypeswrong/cli` - Validates TypeScript declaration exports
- Both run automatically in `build:check`

## Coding Standards and Enhancement Guidelines

### Code Style

**TypeScript Configuration (tsconfig.json):**

- Target: ES2022
- Module: ESNext with CommonJS interop
- Strict mode enabled with ALL flags:
  - `strict: true`
  - `noImplicitAny: true`
  - `strictNullChecks: true`
  - `strictFunctionTypes: true`
  - `strictBindCallApply: true`
  - `strictPropertyInitialization: true`
  - `noImplicitThis: true`
  - `alwaysStrict: true`
  - `noUnusedLocals: true`
  - `noUnusedParameters: true`
  - `noImplicitReturns: true`
  - `noFallthroughCasesInSwitch: true`
  - `noUncheckedIndexedAccess: true`

**ESLint Rules (eslint.config.mjs):**

- Base: `@typescript-eslint/recommended` + `@typescript-eslint/strict`
- Prettier integration via `eslint-config-prettier`
- Custom rules:
  - `@typescript-eslint/no-explicit-any: 'warn'` (source code)
  - `@typescript-eslint/no-explicit-any: 'off'` (tests only)
  - `@typescript-eslint/no-unused-vars: ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]`
  - `@typescript-eslint/explicit-module-boundary-types: 'off'`
  - `@typescript-eslint/no-non-null-assertion: 'warn'`
  - `no-console: 'off'` (logger should be used, but console allowed in examples)

**Prettier Configuration (.prettierrc):**

```json
{
  "semi": false, // No semicolons
  "singleQuote": true, // Single quotes for strings
  "trailingComma": "es5", // ES5 trailing commas (objects/arrays, not functions)
  "tabWidth": 2, // 2-space indentation
  "printWidth": 100, // 100 character line width
  "arrowParens": "always" // Always use parens in arrow functions
}
```

**Import Organization:**

- External imports first
- Internal imports grouped by: types, utilities, providers, strategies
- No relative parent imports beyond one level (use `@/` alias if configured)

### Provider Implementation Standards

**Required Provider Structure:**

````typescript
import request from '@/util/request'
import { ProviderError } from '@/types/errors'

/**
 * ProviderName Provider
 *
 * Detailed description of what this provider does, any limitations,
 * and links to official documentation.
 *
 * @example
 * ```typescript
 * const provider = new ProviderNameProvider({
 *   apiKey: 'your-api-key',
 *   // other config
 * })
 * ```
 */
export default class ChannelProviderNameProvider implements Provider<ChannelRequest> {
  readonly id: string = '{channel}-{provider-name}-provider'

  constructor(config: ProviderConfig) {
    // Validate required config
    if (!config.apiKey) {
      throw new Error('ProviderName requires apiKey')
    }
    this.apiKey = config.apiKey
  }

  async send(request: ChannelRequest): Promise<ProviderSendResult> {
    // 1. Apply customize function if provided
    const customized = request.customize ? await request.customize(this.id, request) : request

    // 2. Transform to provider API format
    const payload = this.transformRequest(customized)

    // 3. Make HTTP request with User-Agent header
    const response = await request('https://api.provider.com/endpoint', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'webventures-comms/v2 (+https://github.com/cryptventure/comms)',
      },
      body: JSON.stringify(payload),
    })

    // 4. Handle errors with ProviderError
    if (!response.ok) {
      const errorBody = await response.text()
      throw new ProviderError(
        `ProviderName API error: ${errorBody}`,
        this.id,
        '{channel}',
        'API_ERROR',
        { statusCode: response.status, response: errorBody }
      )
    }

    // 5. Extract and return message ID
    const result = await response.json()
    return { id: result.messageId }
  }
}
````

**Critical Provider Requirements:**

1. **Provider ID Format**: Must follow `{channel}-{provider-name}-provider`
   - Example: `email-sendgrid-provider`, `sms-twilio-provider`

2. **User-Agent Header**: MUST be exactly:

   ```typescript
   'User-Agent': 'webventures-comms/v2 (+https://github.com/cryptventure/comms)'
   ```

3. **Error Handling**: Use `ProviderError` class with:

   ```typescript
   throw new ProviderError(
     message: string,
     providerId: string,
     channel: string,
     errorCode: string,
     metadata?: { statusCode?: number, response?: unknown }
   )
   ```

4. **Customize Function Support**: Always check and apply `request.customize`:

   ```typescript
   const { field1, field2 } = request.customize
     ? await request.customize(this.id, request)
     : request
   ```

5. **HTTP Client**: Use `request` from `src/util/request.ts` (undici wrapper with proxy support)
   - Never use axios, node-fetch, or other HTTP clients
   - Proxy configuration via `COMMS_HTTP_PROXY` environment variable is automatic

6. **FormData Handling**: For multipart/form-data requests:

   ```typescript
   import FormData from 'form-data'

   const form = new FormData()
   form.append('field', 'value')

   const response = await request(url, {
     method: 'POST',
     headers: {
       Authorization: `Bearer ${this.apiKey}`,
       'User-Agent': 'webventures-comms/v2 (+https://github.com/cryptventure/comms)',
     },
     // @ts-expect-error - form-data FormData is compatible with fetch at runtime
     body: form,
   })
   ```

7. **Request Retry with Exponential Backoff**: The request utility supports automatic retry with exponential backoff for transient failures. See [Retry Utility](#retry-utility) section below for details.

8. **JSDoc Documentation**: All providers must have:
   - Class-level JSDoc with description, links to docs, and usage example
   - Parameter documentation for complex config objects
   - Return type documentation if not obvious

### Strategy Implementation Standards

**Strategy Function Signature:**

````typescript
import type { Provider, ProviderSendResult } from '@/types'
import logger from '@/util/logger'

/**
 * Strategy Name
 *
 * Description of what this strategy does and when to use it.
 *
 * @param providers - Array of providers to use
 * @returns Strategy function that accepts a request
 *
 * @example
 * ```typescript
 * const strategy = strategyName([provider1, provider2])
 * const result = await strategy(request)
 * ```
 */
export default function strategyName<TRequest>(
  providers: Provider<TRequest>[]
): (request: TRequest) => Promise<ProviderSendResult> {
  // Validation
  if (!providers.length) {
    throw new Error('At least one provider is required')
  }

  // Return strategy function
  return async (request: TRequest): Promise<ProviderSendResult> => {
    // Strategy implementation
  }
}
````

**Strategy Requirements:**

- Must validate that providers array is not empty
- Must handle provider errors gracefully
- Must use `logger.warn()` for provider failures (not `console.log`)
- Must return `ProviderSendResult` with `{ id: string, providerId: string }`
- Should attach `providerId` to thrown errors for debugging

### Adding New Features

#### Adding a New Channel

1. **Create channel directory**: `src/providers/{channel}/`
2. **Create provider implementations**: `src/providers/{channel}/{provider}.ts`
3. **Create channel barrel export**: `src/providers/{channel}/index.ts`
4. **Define request type**: Add to `src/types/request.ts`:
   ```typescript
   export interface ChannelRequest {
     // Required fields
     field1: string
     field2: string
     // Optional fields
     customize?: (
       providerId: string,
       request: ChannelRequest
     ) => Promise<ChannelRequest> | ChannelRequest
   }
   ```
5. **Define provider config types**: Create `src/models/provider-{channel}.ts`:
   ```typescript
   export type ChannelProviderConfig =
     | { type: 'provider1'; apiKey: string }
     | { type: 'provider2'; token: string }
   ```
6. **Update SDK config**: Add channel to `CommsSdkConfig` in `src/types/config.ts`
7. **Update provider factory**: Add channel case in `src/providers/index.ts`
8. **Update package exports**: Add entry in `package.json` exports and `tsup.config.ts`
9. **Write tests**: Create `__tests__/providers/{channel}/` directory with tests for each provider
10. **Update documentation**: Add channel section to README.md

#### Adding a Provider to Existing Channel

1. **Create provider file**: `src/providers/{channel}/{provider}.ts`
2. **Implement provider class**: Follow provider implementation standards above
3. **Update provider config**: Add provider type to union in `src/models/provider-{channel}.ts`:
   ```typescript
   export type ChannelProviderConfig =
     | ExistingProvider1Config
     | ExistingProvider2Config
     | { type: 'new-provider' /* config fields */ }
   ```
4. **Update provider factory**: Add case in `createProvider()` factory in `src/providers/{channel}/index.ts`:
   ```typescript
   export const createProvider = (config: ChannelProviderConfig): Provider<ChannelRequest> => {
     if (config.type === 'new-provider') {
       return new NewProviderProvider(config)
     }
     // ... existing cases
   }
   ```
5. **Export provider**: Add to barrel export in `src/providers/{channel}/index.ts`
6. **Write comprehensive tests**: Create `__tests__/providers/{channel}/{provider}.test.ts`:
   - Test with minimal parameters
   - Test with all parameters
   - Test API error handling
   - Test customize function
   - Test request transformation
7. **Update README**: Add provider to documentation

#### Adding a New Strategy

1. **Create strategy file**: `src/strategies/providers/{strategy}.ts`
2. **Implement strategy function**: Follow strategy implementation standards above
3. **Export strategy**: Add to `src/strategies/providers/index.ts`
4. **Update package exports**: Add entry in `package.json` and `tsup.config.ts`:
   ```json
   "./strategies/{strategy}": {
     "import": "./dist/strategies/{strategy}.mjs",
     "require": "./dist/strategies/{strategy}.js"
   }
   ```
5. **Write tests**: Create `__tests__/strategies/providers/{strategy}.test.ts`
6. **Update README**: Document new strategy with examples

### Type Safety Guidelines

**Handling Nullable Types:**

```typescript
// ✅ GOOD: Check for undefined before accessing
if (config.optionalField !== undefined) {
  processField(config.optionalField)
}

// ✅ GOOD: Use optional chaining
const value = config.nested?.property?.value

// ❌ BAD: Non-null assertion (avoid unless absolutely necessary)
const value = config.optionalField!
```

**Array and Object Access:**

```typescript
// ✅ GOOD: Check array length or use optional chaining
const first = array[0]
if (first !== undefined) {
  process(first)
}

// ✅ GOOD: Safe object property access
const value = obj['key']
if (value !== undefined) {
  process(value)
}

// ❌ BAD: Assuming index/key exists without checking
const value = array[0].property // Compiler error with noUncheckedIndexedAccess
```

**Unused Variables:**

```typescript
// ✅ GOOD: Prefix with underscore
const [first, , third] = array
const { needed, _unused } = object

// ✅ GOOD: Omit unused parameters
function handler(_event: Event, data: Data) {
  return process(data)
}
```

**Type vs Interface:**

```typescript
// ✅ GOOD: Use type for unions, intersections, and utility types
type ProviderConfig = SendGridConfig | MailgunConfig | SESConfig

// ✅ GOOD: Use interface for object shapes that may be extended
interface Provider<TRequest> {
  id: string
  send(request: TRequest): Promise<ProviderSendResult>
}
```

### Testing Guidelines

**Test File Structure:**

```typescript
import { vi, test, expect, beforeEach, describe } from 'vitest'
import CommsSdk from '../../../src'
import { mockHttp, mockResponse } from '../mockHttp.test'

// Mock logger to suppress warnings in tests
vi.mock('../../../src/util/logger', () => ({
  default: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

describe('ProviderName', () => {
  test('success with minimal parameters', async () => {
    mockResponse(200, JSON.stringify({ id: 'test-id' }))

    const sdk = new CommsSdk({
      channels: {
        channel: {
          providers: [{ type: 'provider', apiKey: 'key' }],
        },
      },
    })

    const result = await sdk.send({
      channel: {
        /* minimal request */
      },
    })

    expect(mockHttp).toHaveBeenLastCalledWith(
      expect.objectContaining({
        hostname: 'api.provider.com',
        method: 'POST',
        headers: expect.objectContaining({
          'User-Agent': ['webventures-comms/v2 (+https://github.com/cryptventure/comms)'],
        }),
      })
    )

    expect(result).toEqual({
      status: 'success',
      channels: {
        channel: { id: 'test-id', providerId: '{channel}-{provider}-provider' },
      },
    })
  })

  test('success with all parameters', async () => {
    // Test with complete request including all optional fields
  })

  test('API error handling', async () => {
    mockResponse(400, JSON.stringify({ error: 'Invalid request' }))
    // Test error response
  })

  test('customize function', async () => {
    // Test that customize function is called and applied
  })
})
```

**Testing Requirements:**

- Every provider must have tests for:
  1. Success with minimal parameters
  2. Success with all parameters (including customize function)
  3. API error handling (4xx/5xx responses)
  4. Request transformation (verify headers, body, URL)
- Use `mockResponse()` to queue HTTP responses
- Use `mockHttp.toHaveBeenLastCalledWith()` to verify requests
- Mock logger to suppress console output during tests
- Use descriptive test names (what scenario is being tested)

**Coverage Expectations:**

- 100% line, branch, function, and statement coverage for all source code
- Exceptions: `src/providers/push/**`, `src/util/**`, type definitions
- Run `pnpm test:coverage` before committing changes

### Documentation Standards

**JSDoc Requirements:**

- All exported classes, functions, and types must have JSDoc
- Include `@param` for all parameters (if not obvious from types)
- Include `@returns` for return values (if not obvious)
- Include `@throws` for known error conditions
- Include `@example` with realistic usage example
- Link to external documentation when relevant

**Example JSDoc:**

````typescript
/**
 * SendGrid Email Provider
 *
 * Sends transactional emails via the SendGrid v3 API. Supports attachments,
 * CC/BCC, custom headers, and reply-to addresses.
 *
 * @see https://docs.sendgrid.com/api-reference/mail-send/mail-send
 *
 * @example
 * ```typescript
 * const provider = new EmailSendGridProvider({
 *   apiKey: process.env.SENDGRID_API_KEY
 * })
 *
 * const result = await provider.send({
 *   from: 'noreply@example.com',
 *   to: 'user@example.com',
 *   subject: 'Welcome',
 *   html: '<h1>Welcome!</h1>'
 * })
 * ```
 */
export default class EmailSendGridProvider implements Provider<EmailRequest> {
  // ...
}
````

### Git Commit Standards

**Commit Message Format:**

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring (no feature change or bug fix)
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependencies, build, etc.)

**Examples:**

```
feat(email): add mailgun provider

Implements Mailgun email provider with support for attachments,
custom headers, and EU region selection.

Closes #123

fix(sms): correct twilio error handling

Twilio API returns errors in different format for validation
failures vs server errors. Updated error parsing to handle both.

test(providers): add coverage for customize function

Added tests verifying that customize function is called and
applied correctly for all providers.
```

### Performance Considerations

**Async/Await:**

- Use parallel execution for independent operations
- Avoid sequential awaits when not necessary

```typescript
// ✅ GOOD: Parallel execution
const [result1, result2] = await Promise.all([provider1.send(request), provider2.send(request)])

// ❌ BAD: Sequential when not needed
const result1 = await provider1.send(request)
const result2 = await provider2.send(request)
```

**Error Handling in Loops:**

- Use `Promise.allSettled()` when you want to continue despite failures
- Use `Promise.all()` when you want to fail fast

**HTTP Client:**

- Reuse connections via keepAlive (handled by undici automatically)
- Set appropriate timeouts (default 30s in `src/util/request.ts`)
- Use streaming for large payloads when supported

## Retry Utility

The SDK provides a built-in retry mechanism with exponential backoff for handling transient failures. This is available in two ways: integrated into the `request` function and as a standalone `withRetry` wrapper.

### Using Retry with the Request Function

The simplest way to add retry logic is via the `retry` option in the `request` function:

```typescript
import request from 'src/util/request'

// Basic retry with defaults (3 retries, 1s base delay)
const response = await request('https://api.example.com/data', {
  retry: { maxRetries: 3 },
})

// Custom retry configuration
const response = await request('https://api.example.com/data', {
  retry: {
    maxRetries: 5,
    baseDelay: 500, // Start with 500ms delay
    maxDelay: 10000, // Cap at 10 seconds
    retryableStatusCodes: [429, 500, 502, 503, 504],
    onRetry: ({ attempt, error, delay }) => {
      console.log(`Retry ${attempt} after ${delay}ms: ${error.message}`)
    },
  },
})
```

**Important**: By default, only safe HTTP methods (GET, HEAD, OPTIONS) are retried. POST, PUT, DELETE, and PATCH requests are NOT retried to prevent duplicate side effects. To enable retry for unsafe methods, provide a custom `shouldRetry` callback:

```typescript
// Enable retry for POST request (use with caution!)
const response = await request('https://api.example.com/data', {
  method: 'POST',
  body: JSON.stringify({ key: 'value' }),
  retry: {
    maxRetries: 3,
    shouldRetry: ({ statusCode }) => {
      // Only retry on rate limiting
      return statusCode === 429
    },
  },
})
```

### Using withRetry Directly

For non-HTTP operations or more control, use the `withRetry` wrapper:

```typescript
import { withRetry } from '@webventures/comms'

// Retry any async function
const result = await withRetry(() => someAsyncOperation(), { maxRetries: 3 })

// With full configuration
const result = await withRetry(() => callExternalService(), {
  maxRetries: 5,
  baseDelay: 500,
  maxDelay: 10000,
  jitter: true,
  maxJitter: 500,
  shouldRetry: ({ error, statusCode, attempt }) => {
    // Custom retry logic
    if (attempt > 3) return false
    return statusCode === 429 || (statusCode !== undefined && statusCode >= 500)
  },
  onRetry: ({ attempt, error, delay }) => {
    logger.warn(`Retry ${attempt} in ${delay}ms: ${error.message}`)
  },
  signal: AbortSignal.timeout(30000), // Timeout after 30 seconds
})
```

### Retry Configuration Options

| Option                 | Type        | Default                        | Description                                    |
| ---------------------- | ----------- | ------------------------------ | ---------------------------------------------- |
| `maxRetries`           | number      | 3                              | Maximum retry attempts (0 = no retries)        |
| `baseDelay`            | number      | 1000                           | Base delay in milliseconds                     |
| `maxDelay`             | number      | 30000                          | Maximum delay cap in milliseconds              |
| `jitter`               | boolean     | true                           | Add random jitter to prevent thundering herd   |
| `maxJitter`            | number      | 1000                           | Maximum jitter in milliseconds                 |
| `retryableStatusCodes` | number[]    | [408, 429, 500, 502, 503, 504] | Status codes that trigger retry                |
| `shouldRetry`          | function    | -                              | Custom callback for retry decisions            |
| `onRetry`              | function    | -                              | Callback fired before each retry (for logging) |
| `signal`               | AbortSignal | -                              | Signal to cancel retries                       |

### Default Retry Behavior

With default settings, retry delays follow exponential backoff:

- Retry 1: ~1000ms + jitter (1-2 seconds total)
- Retry 2: ~2000ms + jitter (2-3 seconds total)
- Retry 3: ~4000ms + jitter (4-5 seconds total)

**Default retryable status codes:**

- 408: Request Timeout
- 429: Too Many Requests (rate limiting)
- 500: Internal Server Error
- 502: Bad Gateway
- 503: Service Unavailable
- 504: Gateway Timeout

**Network errors** (ECONNREFUSED, ETIMEDOUT, etc.) are retried by default when no status code is present.

### Best Practices

1. **Use retry sparingly in providers**: Most external APIs have their own rate limiting. Use modest retry settings (2-3 retries) to avoid overwhelming the API.

2. **Enable jitter in production**: Jitter prevents the "thundering herd" problem where multiple clients retry simultaneously.

3. **Set appropriate timeouts**: Combine retry with AbortSignal timeout to prevent indefinite waiting:

   ```typescript
   const response = await request(url, {
     signal: AbortSignal.timeout(30000), // 30s overall timeout
     retry: { maxRetries: 3 },
   })
   ```

4. **Log retries for observability**: Use the `onRetry` callback to log retry attempts for debugging and monitoring:

   ```typescript
   onRetry: ({ attempt, error, delay }) => {
     logger.warn(`Retry ${attempt}/${maxRetries} in ${delay}ms`, {
       error: error.message,
       url: 'https://api.example.com/endpoint',
     })
   }
   ```

5. **Be careful with non-idempotent requests**: Only retry POST/PUT/DELETE if the operation is idempotent or you handle duplicates server-side.

### Exported Types and Functions

All retry utilities are exported from the main package:

```typescript
import {
  // Functions
  withRetry,
  calculateBackoff,
  delay,
  getRetryOptionsWithDefaults,
  isRetryableStatusCode,
  getStatusCodeFromError,

  // Constants
  DEFAULT_RETRY_OPTIONS,
  DEFAULT_RETRYABLE_STATUS_CODES,

  // Types
  type RetryOptions,
  type RetryAttemptInfo,
  type ShouldRetryContext,
  type BackoffOptions,
} from '@webventures/comms'
```

## Coverage Requirements

100% coverage required for:

- All source files except:
  - `src/providers/push/**` (native mobile dependencies)
  - `src/util/**` (helper utilities)
  - Type definitions and config files

Run `pnpm test:coverage` to verify coverage thresholds.
