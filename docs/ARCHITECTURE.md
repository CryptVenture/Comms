# Architecture Documentation

Technical architecture and design patterns of WebVentures Comms SDK v2.0.5.

## Table of Contents

- [Overview](#overview)
- [Core Components](#core-components)
- [Design Patterns](#design-patterns)
- [Type System](#type-system)
- [Provider System](#provider-system)
- [Strategy System](#strategy-system)
- [Error Handling](#error-handling)
- [Framework Adapters](#framework-adapters)
- [Dependency Management](#dependency-management)
- [Performance Considerations](#performance-considerations)

---

## Overview

WebVentures Comms SDK v2.0.5 is architected with the following principles:

- **Type Safety**: Full TypeScript implementation with comprehensive types
- **Modularity**: Clear separation of concerns across components
- **Extensibility**: Plugin-based provider and strategy systems
- **Framework Agnostic**: Core library with framework-specific adapters
- **Performance**: Lazy loading, memoization, and efficient data structures
- **Reliability**: Robust error handling and fallback mechanisms

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        CommsSdk                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    Configuration                      │  │
│  │  - Channels                                           │  │
│  │  - Providers                                          │  │
│  │  - Strategies                                         │  │
│  └───────────────┬───────────────────────────────────────┘  │
│                  │                                           │
│  ┌───────────────▼───────────────┐                          │
│  │        Sender                 │                          │
│  │  - Channel orchestration      │                          │
│  │  - Parallel execution         │                          │
│  │  - Result aggregation         │                          │
│  └───────────────┬───────────────┘                          │
│                  │                                           │
│      ┌───────────┼───────────┐                              │
│      │           │           │                              │
│  ┌───▼────┐  ┌──▼─────┐  ┌─▼──────┐                        │
│  │Strategy│  │Strategy│  │Strategy│                        │
│  │ (Email)│  │ (SMS)  │  │ (Push) │                        │
│  └───┬────┘  └──┬─────┘  └─┬──────┘                        │
│      │          │           │                               │
│  ┌───▼────────────────────────▼──┐                          │
│  │      Provider Factory         │                          │
│  │  - Dynamic provider creation  │                          │
│  │  - Instance management        │                          │
│  └───┬────────────────────────┬──┘                          │
│      │                        │                             │
│  ┌───▼────┐  ┌───────┐   ┌──▼──────┐                       │
│  │Provider│  │Provider│   │Provider │                       │
│  │   #1   │  │   #2   │   │  #3    │                       │
│  └────────┘  └────────┘   └─────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. CommsSdk Class

**Location**: `src/index.ts`

**Responsibilities**:

- SDK initialization and configuration
- Provider factory coordination
- Strategy factory coordination
- Public API surface

**Key Methods**:

```typescript
class CommsSdk {
  constructor(options: CommsSdkConfig)
  send(request: NotificationRequest): Promise<NotificationStatus>
  logger: LoggerInstance
}
```

**Design Pattern**: Facade Pattern

- Provides simplified interface to complex subsystem
- Coordinates multiple components (providers, strategies, sender)

### 2. Sender Class

**Location**: `src/sender.ts`

**Responsibilities**:

- Multi-channel notification orchestration
- Parallel channel execution
- Result aggregation
- Error handling and recovery

**Key Features**:

```typescript
class Sender {
  constructor(channels: ChannelType[], providers: ProvidersMap, strategies: StrategiesMap)

  async send(request: NotificationRequest): Promise<NotificationStatus>
  private async sendOnEachChannel(request): Promise<ChannelSendResult[]>
}
```

**Design Pattern**: Coordinator Pattern

- Manages parallel execution across channels
- Aggregates results from multiple sources
- Handles partial failures gracefully

### 3. Provider Factory

**Location**: `src/providers/index.ts`

**Responsibilities**:

- Dynamic provider instantiation
- Provider type validation
- Custom provider support
- Provider lifecycle management

**Design Pattern**: Factory Pattern + Registry Pattern

```typescript
function providerFactory(channels: ChannelsConfig): ProvidersMap {
  // Creates providers based on configuration
  // Registers instances in registry
  // Returns provider map by channel
}
```

### 4. Strategy Factory

**Location**: `src/strategies/providers/index.ts`

**Responsibilities**:

- Strategy selection and instantiation
- Built-in strategy support (fallback, roundrobin, no-fallback)
- Custom strategy support

**Design Pattern**: Strategy Pattern + Factory Pattern

```typescript
function strategyProvidersFactory(channels): StrategiesMap {
  // Selects appropriate strategy per channel
  // Returns strategy function map
}
```

---

## Design Patterns

### 1. Factory Pattern

Used extensively for provider and strategy creation:

```typescript
// Provider Factory
function createEmailProvider(config: EmailProvider): Provider<EmailRequest> {
  switch (config.type) {
    case 'smtp':
      return new SmtpProvider(config)
    case 'sendgrid':
      return new SendGridProvider(config)
    // ... other providers
  }
}
```

**Benefits**:

- Decouples provider creation from usage
- Enables dynamic provider selection
- Supports dependency injection

### 2. Strategy Pattern

Multi-provider strategies are implemented using Strategy pattern:

```typescript
interface StrategyFunction<TRequest = unknown> {
  (providers: Provider<TRequest>[]): (request: TRequest) => Promise<ProviderSendResult>
}

// Fallback strategy implementation
const strategyFallback: StrategyFunction = (providers) => {
  return async (request) => {
    // Try providers in sequence until success
  }
}
```

**Benefits**:

- Interchangeable provider selection algorithms
- Easy to add new strategies
- No modification to existing code

### 3. Facade Pattern

CommsSdk class provides a facade to complex subsystem:

```typescript
class CommsSdk {
  private sender: Sender

  constructor(config: CommsSdkConfig) {
    // Initialize complex subsystem
    const providers = providerFactory(config.channels)
    const strategies = strategyProvidersFactory(config.channels)
    this.sender = new Sender(channels, providers, strategies)
  }

  // Simple public API
  send(request: NotificationRequest) {
    return this.sender.send(request)
  }
}
```

### 4. Registry Pattern

Provider instances are cached in a registry:

```typescript
class Registry {
  private static instances = new Map<string, unknown>()

  static getInstance<T>(key: string, factory: () => T): T {
    if (!this.instances.has(key)) {
      this.instances.set(key, factory())
    }
    return this.instances.get(key) as T
  }
}
```

**Benefits**:

- Prevents duplicate provider instances
- Memory efficiency
- Centralized instance management

### 5. Adapter Pattern

Framework adapters adapt SDK for specific environments:

```typescript
// Next.js adapter
export function createNextJSComms(config: CommsSdkConfig): CommsSdk {
  // Verify server environment
  if (typeof window !== 'undefined') {
    throw new Error('Must run server-side')
  }

  return new CommsSdk(config)
}

// React Native adapter
export function createReactNativeComms(config: CommsSdkConfig): CommsSdk {
  // Adapt for React Native environment
  return new CommsSdk(config)
}
```

---

## Type System

### Type Hierarchy

```
NotificationRequest
├── EmailRequest
├── SmsRequest
├── PushRequest
├── VoiceRequest
├── WebpushRequest
├── SlackRequest
└── WhatsappRequest

ProviderConfig
├── EmailProvider
│   ├── EmailProviderSmtp
│   ├── EmailProviderSendGrid
│   ├── EmailProviderSes
│   └── ...
├── SmsProvider
│   ├── SmsProviderTwilio
│   ├── SmsProviderNexmo
│   └── ...
└── ...
```

### Discriminated Unions

Provider types use discriminated unions for type safety:

```typescript
type EmailProvider =
  | { type: 'smtp'; host: string; port: number; ... }
  | { type: 'sendgrid'; apiKey: string }
  | { type: 'ses'; region: string; ... }

function createEmailProvider(config: EmailProvider) {
  switch (config.type) {
    case 'smtp':
      // TypeScript knows config has host, port, etc.
      return new SmtpProvider(config)
    case 'sendgrid':
      // TypeScript knows config has apiKey
      return new SendGridProvider(config)
  }
}
```

### Generic Types

Strategy functions use generics for type safety:

```typescript
type StrategyFunction<TRequest = unknown> = (
  providers: Provider<TRequest>[]
) => (request: TRequest) => Promise<ProviderSendResult>

const emailStrategy: StrategyFunction<EmailRequest> = (providers) => {
  return async (request: EmailRequest) => {
    // request is strongly typed as EmailRequest
  }
}
```

---

## Provider System

### Provider Interface

All providers implement a common interface:

```typescript
interface Provider<TRequest = unknown> {
  id: string
  send(request: TRequest): Promise<string>
}
```

### Provider Lifecycle

```
Configuration → Factory → Registration → Execution

1. User provides config:
   { type: 'sendgrid', apiKey: 'xxx' }

2. Factory creates instance:
   const provider = new SendGridProvider(config)

3. Registry stores instance:
   Registry.set('sendgrid-default', provider)

4. Strategy uses provider:
   const id = await provider.send(request)
```

### Custom Provider Integration

```typescript
{
  type: 'custom',
  id: 'my-provider',
  send: async (request: EmailRequest): Promise<string> => {
    // Custom implementation
    return messageId
  }
}
```

The custom provider is wrapped in an adapter:

```typescript
class CustomProviderAdapter implements Provider<EmailRequest> {
  id: string
  private sendFn: (request: EmailRequest) => Promise<string>

  constructor(config: CustomProviderConfig<EmailRequest>) {
    this.id = config.id
    this.sendFn = config.send
  }

  async send(request: EmailRequest): Promise<string> {
    return this.sendFn(request)
  }
}
```

---

## Strategy System

### Strategy Interface

```typescript
type StrategyFunction<TRequest = unknown> = (
  providers: Provider<TRequest>[]
) => (request: TRequest) => Promise<ProviderSendResult>
```

### Built-in Strategies

#### Fallback Strategy

```typescript
const strategyFallback: StrategyFunction = (providers) => {
  return async (request) => {
    for (const provider of providers) {
      try {
        const id = await provider.send(request)
        return { id, providerId: provider.id }
      } catch (error) {
        // Try next provider
        if (provider === providers[providers.length - 1]) {
          throw error // Last provider, rethrow
        }
      }
    }
  }
}
```

#### Round-Robin Strategy

```typescript
let currentIndex = 0

const strategyRoundRobin: StrategyFunction = (providers) => {
  return async (request) => {
    const startIndex = currentIndex

    while (true) {
      const provider = providers[currentIndex]
      currentIndex = (currentIndex + 1) % providers.length

      try {
        const id = await provider.send(request)
        return { id, providerId: provider.id }
      } catch (error) {
        if (currentIndex === startIndex) {
          throw error // Tried all providers
        }
      }
    }
  }
}
```

### Strategy Selection

```typescript
function getStrategy(name: MultiProviderStrategyType | StrategyFunction): StrategyFunction {
  if (typeof name === 'function') {
    return name // Custom strategy
  }

  switch (name) {
    case 'fallback':
      return strategyFallback
    case 'roundrobin':
      return strategyRoundRobin
    case 'no-fallback':
      return strategyNoFallback
  }
}
```

---

## Error Handling

### Error Hierarchy

```
Error
└── CommsError
    ├── ProviderError
    ├── ConfigurationError
    ├── ValidationError
    └── NetworkError
```

### Error Flow

```
Provider sends request
       ↓
 ┌─────────────┐
 │   Success?  │
 └─────┬───────┘
       │
   Yes │ No
       │  ↓
       │ Error caught by strategy
       │  ↓
       │ Fallback to next provider (if strategy supports)
       │  ↓
       │ All providers failed?
       │  ↓
       │ Throw ProviderError
       ↓
 Return { id, providerId }
```

### Error Enrichment

Errors are enriched with context as they bubble up:

```typescript
try {
  await provider.send(request)
} catch (error) {
  if (error instanceof Error) {
    ;(error as ProviderError).providerId = provider.id(error as ProviderError).channel = channel
  }
  throw error
}
```

---

## Framework Adapters

### Adapter Architecture

```
┌─────────────────────────────────────┐
│     Framework-Specific Layer        │
│  (Next.js, React Native, etc.)      │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│       Adapter Layer                 │
│  - Environment detection            │
│  - Framework-specific utilities     │
│  - Validation                       │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│       Core SDK Layer                │
│  - CommsSdk                       │
│  - Sender                           │
│  - Providers                        │
│  - Strategies                       │
└─────────────────────────────────────┘
```

### Next.js Adapter

```typescript
export function createNextJSComms(config: CommsSdkConfig): CommsSdk {
  // 1. Validate environment
  if (typeof window !== 'undefined') {
    throw new Error('Must run server-side')
  }

  // 2. Create SDK instance
  return new CommsSdk(config)
}

export function withComms<TArgs, TReturn>(
  handler: (sdk: CommsSdk, ...args: TArgs[]) => Promise<TReturn>,
  config: CommsSdkConfig
) {
  // 3. Lazy initialization pattern
  let instance: CommsSdk | null = null

  return async (...args: TArgs[]): Promise<TReturn> => {
    if (!instance) {
      instance = createNextJSComms(config)
    }
    return handler(instance, ...args)
  }
}
```

---

## Dependency Management

### Internal Dependencies

- **Winston**: Logging (abstracted via logger interface)
- **Nodemailer**: SMTP email sending
- **Undici**: Modern HTTP client
- **Web-push**: Web push notifications
- **Node-pushnotifications**: Mobile push (APNs, FCM, etc.)

### Dependency Injection

Providers use dependency injection for testability:

```typescript
class SendGridProvider implements Provider<EmailRequest> {
  constructor(
    private config: EmailProviderSendGrid,
    private httpClient = fetch // Injectable for testing
  ) {}

  async send(request: EmailRequest): Promise<string> {
    const response = await this.httpClient(...)
    return response.messageId
  }
}
```

### Tree Shaking

The SDK is structured for tree shaking:

```typescript
// Only import what you need
import CommsSdk from '@webventures/comms'
import { createNextJSComms } from '@webventures/comms/adapters'

// Unused providers and strategies are not bundled
```

---

## Performance Considerations

### 1. Lazy Initialization

Providers are only created when needed:

```typescript
const comms = new CommsSdk(config) // Providers created here

// Provider instances cached in registry
await comms.send(request) // Uses cached instances
```

### 2. Memoization

Sender functions are memoized per channel:

```typescript
class Sender {
  private senders: Record<ChannelType, SenderFunction>

  constructor(...) {
    // Pre-compute senders once during initialization
    this.senders = Object.keys(strategies).reduce((acc, channel) => {
      acc[channel] = strategies[channel](providers[channel])
      return acc
    }, {})
  }
}
```

### 3. Parallel Execution

Channels are processed in parallel:

```typescript
async sendOnEachChannel(request): Promise<ChannelSendResult[]> {
  return Promise.all(
    channels.map(async (channel) => {
      // Send on each channel in parallel
    })
  )
}
```

### 4. Connection Pooling

SMTP providers support connection pooling:

```typescript
{
  type: 'smtp',
  pool: true,
  maxConnections: 5,
  maxMessages: 100
}
```

---

## Security Considerations

### 1. API Key Management

- Never log API keys
- Support for environment variables
- Validation of required credentials

### 2. Input Validation

- Type checking via TypeScript
- Runtime validation of critical fields
- Sanitization of user inputs

### 3. TLS/SSL

- SMTP secure connections
- HTTPS for API calls
- Certificate validation

### 4. Error Information

- Avoid exposing sensitive data in errors
- Sanitize error messages for client consumption
- Detailed logging server-side only

---

## Testing Architecture

### Unit Tests

```typescript
// Mock providers
const mockProvider: Provider<EmailRequest> = {
  id: 'mock-provider',
  send: vi.fn().mockResolvedValue('message-id'),
}

// Test strategy
const result = await strategyFallback([mockProvider])(request)
expect(mockProvider.send).toHaveBeenCalledWith(request)
```

### Integration Tests

```typescript
// Use notification catcher
const comms = new CommsSdk({
  useNotificationCatcher: true
})

// Verify notification in catcher
const result = await comms.send({...})
expect(result.status).toBe('success')
```

---

## Future Architecture Considerations

### Planned Enhancements

1. **Plugin System**: Allow third-party plugins for providers and strategies
2. **Event System**: Emit events for monitoring and debugging
3. **Middleware**: Support for request/response middleware
4. **Batch Operations**: Efficient bulk notification sending
5. **Webhooks**: Built-in webhook handling for delivery status

### Scalability

The architecture supports horizontal scaling:

- Stateless design (no shared state between instances)
- Connection pooling for efficiency
- Queue integration support (Bull, RabbitMQ)
- Distributed tracing ready (via logging hooks)

---

## See Also

- [Main Documentation](./README.md)
- [API Reference](./API.md)
- [Provider Configuration](./PROVIDERS.md)
- [Examples](./EXAMPLES.md)
