# Architecture Analysis

## Design Patterns

### 1. Factory Pattern

**Location**: `src/providers/index.js`, `src/util/registry.js`

The SDK uses a factory pattern to instantiate providers based on configuration:

```javascript
// User provides config
{
  type: 'sendgrid',
  apiKey: 'xxx'
}

// Factory creates provider instance
const provider = factory.create(config)
```

### 2. Strategy Pattern

**Location**: `src/strategies/providers/`

Multiple strategies for handling multiple providers:

- **Fallback**: Try next provider on error
- **Round Robin**: Distribute load, fallback on error
- **No Fallback**: Single provider, fail on error
- **Custom**: User-defined strategy function

### 3. Registry Pattern

**Location**: `src/util/registry.js`

Provider registration and lookup:

```javascript
class Registry {
  register(id, provider)
  get(id)
  getAll()
}
```

### 4. Adapter Pattern

**Location**: All provider implementations

Each provider adapts its specific API to a common interface:

```javascript
class ProviderAdapter {
  async send(request: NotificationRequest): Promise<string>
}
```

## Data Flow

```
User Code
    ↓
CommsSdk.send(request)
    ↓
Sender (per channel)
    ↓
Strategy (multi-provider logic)
    ↓
Provider(s) (external API calls)
    ↓
Return {id, providerId} or Error
```

### Detailed Flow

1. **Request Validation**
   - User provides notification request object
   - SDK validates structure (handled implicitly)

2. **Channel Routing**
   - SDK separates request by channel (email, sms, etc.)
   - Each channel has independent sender

3. **Strategy Selection**
   - Based on config, strategy is selected
   - Strategy determines which provider(s) to use

4. **Provider Execution**
   - Provider transforms request to API-specific format
   - Makes HTTP/SMTP call to external service
   - Returns notification ID

5. **Response Aggregation**
   - Results from all channels combined
   - Returns success/error status per channel

## Core Modules

### 1. CommsSdk Class (`src/index.js`)

**Responsibility**: Main SDK interface

```javascript
class CommsSdk {
  constructor(config)
  send(request): Promise<NotificationStatus>
  logger: Logger
}
```

### 2. Sender Class (`src/sender.js`)

**Responsibility**: Channel-specific sending logic

```javascript
class Sender {
  constructor(channel, providers, strategy)
  send(request): Promise<{id, providerId}>
}
```

### 3. Provider Base Pattern

**Responsibility**: Common provider interface

```javascript
interface Provider {
  id: string
  send(request): Promise<string>  // Returns notification ID
}
```

### 4. Request Models (`src/models/notification-request.js`)

**Responsibility**: Type definitions for all channels

Flow types for:

- EmailRequestType
- SmsRequestType
- PushRequestType
- VoiceRequestType
- WebpushRequestType
- SlackRequestType
- WhatsappRequestType

### 5. Provider Models (`src/models/provider-*.js`)

**Responsibility**: Configuration types for providers

Each provider type defines its config schema.

## Provider Implementation Pattern

All providers follow this pattern:

```javascript
// 1. Import dependencies
import makeRequest from '../../util/request'

// 2. Export default function factory
export default (config) => {
  // 3. Validate config
  const {apiKey, ...options} = config

  // 4. Return provider object
  return {
    id: 'provider-id',

    // 5. Implement send method
    send: async (request) => {
      // Transform request
      const body = transformRequest(request)

      // Make API call
      const response = await makeRequest({
        url: API_URL,
        method: 'POST',
        headers: {...},
        body
      })

      // Extract and return ID
      return response.id
    }
  }
}
```

## Extension Points

### 1. Custom Providers

Users can add custom providers with minimal code:

```javascript
{
  type: 'custom',
  id: 'my-provider',
  send: async (request) => {
    // Custom logic
    return 'notification-id'
  }
}
```

### 2. Custom Channels

Users can define entirely new channels:

```javascript
{
  channels: {
    telegram: {
      providers: [{...}]
    }
  }
}
```

### 3. Custom Strategies

Users can provide strategy functions:

```javascript
const customStrategy = (providers) => async (request) => {
  // Custom provider selection logic
  const provider = selectProvider(providers)
  return await provider.send(request)
}
```

## Error Handling

### Provider Level

- Providers throw errors on failure
- Errors include providerId for tracking

### Strategy Level

- Fallback strategy catches and retries
- Round-robin tracks failures and rotates
- Errors propagated to SDK level if all providers fail

### SDK Level

```javascript
{
  status: 'error',
  channels: {
    sms: {id: undefined, providerId: 'twilio'}
  },
  errors: {
    sms: Error('Connection failed')
  }
}
```

## Configuration System

### Hierarchical Config

```javascript
{
  // Global SDK options
  useNotificationCatcher: boolean,

  // Per-channel config
  channels: {
    email: {
      // Multi-provider strategy
      multiProviderStrategy: 'fallback' | 'roundrobin' | 'no-fallback' | Function,

      // Provider list
      providers: [
        {type: 'sendgrid', apiKey: '...'},
        {type: 'ses', region: '...'}
      ]
    }
  }
}
```

### Environment Variables

- `COMMS_CATCHER_OPTIONS`: Custom notification catcher SMTP URL
- `COMMS_HTTP_PROXY`: HTTP proxy for all requests

## TypeScript Migration Considerations

### Type Safety Improvements Needed

1. **Strict provider type checking** - Ensure config matches provider requirements
2. **Generic types for strategies** - Type-safe strategy functions
3. **Discriminated unions for requests** - Better channel-specific typing
4. **Provider return types** - Structured response types

### Module System

- Convert to ESM (with CJS compat)
- Use `exports` field in package.json for React Native compatibility
- Tree-shakeable provider imports

### Compatibility Requirements

1. **React 19**: No React dependencies, but ensure no conflicts
2. **Next.js 16+**: SSR-safe (no window/document access)
3. **React Native**: No Node.js-specific APIs in core
4. **Edge Runtime**: Optional lightweight build without heavy deps
