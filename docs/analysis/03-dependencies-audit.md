# Dependencies Audit & Upgrade Plan

## Current Production Dependencies

| Package                  | Current Version | Latest Version | Status  | Notes                                |
| ------------------------ | --------------- | -------------- | ------- | ------------------------------------ |
| `@babel/runtime-corejs2` | ^7.0.0          | -              | REMOVE  | Not needed with TypeScript           |
| `form-data`              | 4.0.2           | 4.0.2          | KEEP    | Latest, needed for multipart uploads |
| `https-proxy-agent`      | 7.0.6           | 7.0.6          | KEEP    | Latest, needed for proxy support     |
| `node-fetch`             | 2.7.0           | 2.7.0          | UPGRADE | Update to undici or native fetch     |
| `node-pushnotifications` | 3.1.1           | 3.1.1          | AUDIT   | Check for security issues, may fork  |
| `nodemailer`             | 6.9.10          | 6.9.16         | UPGRADE | Security updates available           |
| `web-push`               | 3.6.7           | 3.7.0          | UPGRADE | New version available                |
| `winston`                | 3.17.0          | 3.17.0         | KEEP    | Latest                               |

## Current Development Dependencies

| Package                 | Current | Status  | Replacement                     |
| ----------------------- | ------- | ------- | ------------------------------- |
| All `@babel/*` packages | ^7.0.0  | REMOVE  | Use TypeScript compiler         |
| `babel-eslint`          | 10.1.0  | REMOVE  | Use `@typescript-eslint/parser` |
| `flow-bin`              | 0.89.0  | REMOVE  | Use TypeScript                  |
| `jest`                  | 29.7.0  | REPLACE | Use `vitest` ^3.0.0             |
| `standard`              | 14.3.4  | REPLACE | Use ESLint + Prettier           |
| `nodemon`               | 3.1.9   | KEEP    | Development tool                |
| `notification-catcher`  | 1.2.1   | KEEP    | Development tool                |

## New Dependencies to Add

### Build & TypeScript

```json
{
  "typescript": "^5.7.0",
  "tsup": "^8.3.5",
  "@types/node": "^22.10.5",
  "@types/nodemailer": "^6.4.17",
  "@types/node-fetch": "^2.6.11",
  "@types/web-push": "^3.6.3"
}
```

### Testing

```json
{
  "vitest": "^3.0.0",
  "@vitest/coverage-v8": "^3.0.0",
  "@vitest/ui": "^3.0.0"
}
```

### Linting & Formatting

```json
{
  "eslint": "^9.18.0",
  "@typescript-eslint/parser": "^8.21.0",
  "@typescript-eslint/eslint-plugin": "^8.21.0",
  "prettier": "^3.4.2",
  "eslint-config-prettier": "^10.0.1",
  "eslint-plugin-prettier": "^5.2.1"
}
```

### Modern Replacements

```json
{
  "undici": "^7.5.1", // Modern fetch API
  "tsx": "^4.19.2", // TypeScript execution
  "publint": "^0.2.12", // Package validation
  "attw": "^0.1.1" // Are the types wrong?
}
```

## Provider SDK Upgrades

### Email Providers

- **AWS SES**: Use `@aws-sdk/client-ses` ^3.x instead of custom AWS signature
- **Sendgrid**: `@sendgrid/mail` ^8.x
- **Mailgun**: `mailgun.js` ^10.x
- **Mandrill**: Keep custom implementation
- **Sparkpost**: `@sparkpost/sparky` or custom

### SMS Providers

- **Twilio**: `twilio` ^5.x
- **Nexmo/Vonage**: `@vonage/server-sdk` ^3.x
- **Plivo**: `plivo` ^4.x
- **Infobip**: Custom API client
- **OVH**: `ovh` ^3.x
- **Others**: Custom implementations

### Push Providers

- **APN**: `@parse/node-apn` ^6.x or `apn` ^3.x
- **FCM**: `firebase-admin` ^13.x
- **WNS**: Keep custom implementation
- **ADM**: Keep custom implementation

## Package Manager Migration

### From Yarn to pnpm

**Benefits:**

- Faster installation
- Stricter dependency resolution
- Better monorepo support
- Disk space efficiency
- React Native compatibility

**Migration Steps:**

1. Install pnpm globally: `npm install -g pnpm`
2. Generate `pnpm-lock.yaml`: `pnpm import` (from yarn.lock)
3. Remove `yarn.lock`
4. Update CI/CD to use pnpm
5. Update documentation

### pnpm Configuration

**pnpm-workspace.yaml**:

```yaml
packages:
  - '.'
```

**.npmrc**:

```ini
node-linker=hoisted
strict-peer-dependencies=false
auto-install-peers=true
shamefully-hoist=false
```

## Breaking Changes Assessment

### Potential Breaking Changes

1. **Module System**: CJS → ESM (with CJS compat)
   - Impact: Import syntax changes for some users
   - Mitigation: Dual export, documented migration guide

2. **Node.js Version**: Require Node.js 18+
   - Impact: Users on older Node versions must upgrade
   - Justification: Native fetch, better TypeScript support

3. **Return Types**: Stricter typing
   - Impact: TypeScript users may need type adjustments
   - Mitigation: Good migration guide

4. **Provider APIs**: Some provider updates may change behavior
   - Impact: Minimal, mostly internal
   - Mitigation: Extensive testing

### Non-Breaking Changes

1. JavaScript users can continue using without TypeScript
2. All existing APIs remain the same
3. Provider configurations unchanged
4. Strategy pattern unchanged

## Security Considerations

### Dependency Vulnerabilities

Run regular audits:

```bash
pnpm audit
npm audit  # for comparison
```

### Supply Chain Security

1. **Lock file**: Commit `pnpm-lock.yaml`
2. **Integrity checks**: pnpm validates checksums
3. **Provenance**: Use npm provenance when publishing
4. **SIG Store**: Consider signing releases

### Provider Credentials

1. Never log credentials
2. Support environment variables
3. Validate credentials before use
4. Clear error messages (without exposing secrets)

## Node.js Version Support

### Minimum Version: Node.js 18 LTS

**Justification:**

- Native Fetch API (no need for node-fetch)
- Better ESM support
- Web Crypto API
- Still in LTS until April 2025

### Testing Matrix

- Node.js 18 LTS (minimum)
- Node.js 20 LTS (recommended)
- Node.js 22 Current

## React/Next.js Compatibility

### React 19 Compatibility

- No React dependencies in core
- Ensure no use of deprecated patterns
- Test with React 19 example app

### Next.js 16+ Compatibility

- SSR-safe: No browser globals
- Edge runtime compatible (optional)
- Tree-shakeable imports
- Proper package.json exports

### React Native Compatibility

- No Node.js-only APIs in core types
- Separate build for RN (optional)
- Exports field for RN resolution
- Metro bundler compatible

## Build Output Structure

```
dist/
├── index.js          # CJS entry
├── index.mjs         # ESM entry
├── index.d.ts        # Type definitions
├── providers/        # Tree-shakeable providers
│   ├── email/
│   ├── sms/
│   └── ...
└── strategies/       # Strategies
```

## Package.json Exports

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "default": "./dist/index.mjs"
    },
    "./providers/*": {
      "types": "./dist/providers/*.d.ts",
      "import": "./dist/providers/*.mjs",
      "require": "./dist/providers/*.js"
    },
    "./package.json": "./package.json"
  },
  "main": "./dist/index.js",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts"
}
```
