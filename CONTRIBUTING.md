# Contributing to WebVentures Comms SDK

Thank you for your interest in contributing to WebVentures Comms SDK! This document provides guidelines and instructions for contributing to the project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Adding New Features](#adding-new-features)
- [Project Structure](#project-structure)
- [Getting Help](#getting-help)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please be respectful and constructive in all interactions.

## Getting Started

### Prerequisites

- **Node.js**: >= 18.0.0
- **pnpm**: >= 10.0.0 (install with `npm install -g pnpm`)
- **TypeScript**: >= 5.0.0

### Initial Setup

1. **Fork the repository** on GitHub

2. **Clone your fork**:

   ```bash
   git clone https://github.com/YOUR_USERNAME/Comms.git
   cd comms
   ```

3. **Add upstream remote**:

   ```bash
   git remote add upstream https://github.com/CryptVenture/Comms.git
   ```

4. **Install dependencies**:

   ```bash
   pnpm install
   ```

5. **Verify setup**:

   ```bash
   # Run tests
   pnpm test

   # Type check
   pnpm type-check

   # Build
   pnpm build
   ```

## Development Workflow

### 1. Create a Branch

Always create a new branch for your work:

```bash
# Update your fork
git checkout master
git pull upstream master

# Create a feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-description
```

**Branch Naming Conventions**:

- Features: `feature/description`
- Bug fixes: `fix/description`
- Documentation: `docs/description`
- Refactoring: `refactor/description`
- Tests: `test/description`
- Chores: `chore/description`

### 2. Make Changes

- Write clean, well-documented code
- Follow the coding standards (see below)
- Add tests for new functionality
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run all tests
pnpm test

# Run tests in watch mode during development
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test __tests__/path/to/file.test.ts

# Type check
pnpm type-check

# Lint and format
pnpm lint:fix
```

### 4. Commit Your Changes

Follow our commit message guidelines (see below).

### 5. Push and Create PR

```bash
git push origin your-branch-name
```

Then create a Pull Request on GitHub.

## Coding Standards

### TypeScript Configuration

The project uses **strict mode** with all TypeScript strict flags enabled:

- `strict: true`
- `noImplicitAny: true`
- `strictNullChecks: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noImplicitReturns: true`
- `noUncheckedIndexedAccess: true`

### ESLint Rules

- Base: `@typescript-eslint/recommended` + `@typescript-eslint/strict`
- `@typescript-eslint/no-explicit-any: 'warn'` (source code)
- `@typescript-eslint/no-explicit-any: 'off'` (tests only)
- Unused variables must be prefixed with underscore: `_variable`

### Code Formatting (Prettier)

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "printWidth": 100,
  "arrowParens": "always"
}
```

**Important**:

- No semicolons
- Single quotes for strings
- 2-space indentation
- 100 character line width

### Code Style Guidelines

**✅ DO:**

```typescript
// Use type for unions and utility types
type ProviderConfig = SendGridConfig | MailgunConfig | SESConfig

// Check for undefined before accessing
if (config.optionalField !== undefined) {
  processField(config.optionalField)
}

// Use optional chaining
const value = config.nested?.property?.value

// Prefix unused variables with underscore
const [first, , third] = array
const { needed, _unused } = object
```

**❌ DON'T:**

```typescript
// Avoid non-null assertions unless absolutely necessary
const value = config.optionalField! // BAD

// Don't assume index/key exists without checking
const value = array[0].property // Compiler error with noUncheckedIndexedAccess
```

### JSDoc Documentation

All exported classes, functions, and types must have JSDoc comments:

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
````

### Import Organization

```typescript
// External imports first
import { vi, test, expect } from 'vitest'
import FormData from 'form-data'

// Internal imports grouped by: types, utilities, providers, strategies
import type { EmailRequest } from '@/types'
import { redactPii } from '@/util/redact-pii'
import EmailProvider from '@/providers/email'
```

## Testing Guidelines

### Test Structure

Every provider must have tests for:

1. ✅ Success with minimal parameters
2. ✅ Success with all parameters (including customize function)
3. ✅ API error handling (4xx/5xx responses)
4. ✅ Request transformation (verify headers, body, URL)

```typescript
import { vi, test, expect, describe } from 'vitest'
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

  test('API error handling', async () => {
    mockResponse(400, JSON.stringify({ error: 'Invalid request' }))
    // Test error response
  })
})
```

### Coverage Requirements

- **100% coverage** required for all source code
- Exceptions: `src/providers/push/**`, `src/util/**`, type definitions
- Run `pnpm test:coverage` before committing

## Commit Message Guidelines

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring (no feature change or bug fix)
- `test`: Adding or updating tests
- `chore`: Maintenance tasks (dependencies, build, etc.)

### Examples

**Feature:**

```
feat(email): add mailgun provider

Implements Mailgun email provider with support for attachments,
custom headers, and EU region selection.

Closes #123
```

**Bug Fix:**

```
fix(sms): correct twilio error handling

Twilio API returns errors in different format for validation
failures vs server errors. Updated error parsing to handle both.
```

**Tests:**

```
test(providers): add coverage for customize function

Added tests verifying that customize function is called and
applied correctly for all providers.
```

### Rules

- Use present tense ("add" not "added")
- Use imperative mood ("move" not "moves")
- First line max 72 characters
- Include issue/PR references in footer
- Explain the "why" not just the "what" in the body

## Pull Request Process

### Before Submitting

1. ✅ **All tests pass**: `pnpm test`
2. ✅ **Type check passes**: `pnpm type-check`
3. ✅ **Linting passes**: `pnpm lint:fix`
4. ✅ **Coverage maintained**: `pnpm test:coverage`
5. ✅ **Build succeeds**: `pnpm build`
6. ✅ **Documentation updated** if needed
7. ✅ **CHANGELOG.md updated** for user-facing changes

### PR Title

Use the same format as commit messages:

```
feat(email): add mailgun provider
fix(sms): correct twilio error handling
docs: update contributing guide
```

### PR Description Template

```markdown
## Summary

<!-- Brief description of changes -->

## Type of Change

- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature causing existing functionality to not work as expected)
- [ ] Documentation update

## Changes Made

<!-- List key changes -->

- Added X
- Updated Y
- Fixed Z

## Testing

<!-- How was this tested? -->

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)

<!-- Add screenshots for UI changes -->

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added and passing
- [ ] Coverage maintained at 100%
```

### Review Process

1. **Automated checks** must pass (CI/CD)
2. **Code review** by at least one maintainer
3. **Discussion and iteration** as needed
4. **Approval and merge** by maintainer

### After Your PR is Merged

1. **Delete your branch**:

   ```bash
   git branch -d feature/your-feature
   git push origin --delete feature/your-feature
   ```

2. **Update your fork**:
   ```bash
   git checkout master
   git pull upstream master
   git push origin master
   ```

## Adding New Features

### Adding a New Provider

See the [Provider Implementation Guide](./CLAUDE.md#provider-implementation-standards) in CLAUDE.md for detailed instructions.

**Quick checklist**:

1. Create provider file in `src/providers/{channel}/{provider}.ts`
2. Implement provider class following standards
3. Update provider config types in `src/models/provider-{channel}.ts`
4. Update provider factory in `src/providers/{channel}/index.ts`
5. Export provider in barrel export
6. Write comprehensive tests
7. Update README.md

**Critical requirements**:

- Provider ID format: `{channel}-{provider-name}-provider`
- User-Agent header: `webventures-comms/v2 (+https://github.com/cryptventure/comms)`
- Use `ProviderError` for errors
- Support `request.customize` function
- Use `src/util/request.ts` for HTTP requests

### Adding a New Channel

1. Create channel directory: `src/providers/{channel}/`
2. Create provider implementations
3. Define request types in `src/models/notification-request.ts`
4. Define provider config types in `src/models/provider-{channel}.ts`
5. Update SDK config in `src/types/config.ts`
6. Update provider factory in `src/providers/index.ts`
7. Update package exports in `package.json` and `tsup.config.ts`
8. Write tests for all providers
9. Update documentation

### Adding a New Strategy

1. Create strategy file: `src/strategies/providers/{strategy}.ts`
2. Implement strategy function following standards
3. Export strategy in `src/strategies/providers/index.ts`
4. Update package exports
5. Write tests
6. Document in README.md

## Project Structure

```
comms/
├── src/
│   ├── adapters/          # Framework-specific adapters (Next.js, React, etc.)
│   ├── models/            # Type definitions for requests and configs
│   ├── providers/         # Notification providers (email, SMS, push, etc.)
│   │   ├── email/        # Email providers (SendGrid, SES, Mailgun, etc.)
│   │   ├── sms/          # SMS providers (Twilio, Vonage, Plivo, etc.)
│   │   ├── push/         # Push notification providers
│   │   ├── voice/        # Voice call providers
│   │   ├── webpush/      # Web push providers
│   │   ├── slack/        # Slack providers
│   │   ├── whatsapp/     # WhatsApp providers
│   │   └── logger.ts     # Logger provider (development/testing)
│   ├── strategies/        # Provider selection strategies
│   │   └── providers/    # Fallback, round-robin, no-fallback
│   ├── types/            # Core TypeScript types
│   ├── util/             # Utility functions
│   ├── index.ts          # Main entry point
│   └── sender.ts         # Core sending logic
├── __tests__/            # Test files (mirrors src/ structure)
├── examples/             # Usage examples
├── docs/                 # Documentation
├── CLAUDE.md            # Developer guide for AI assistants
├── CONTRIBUTING.md      # This file
└── README.md            # Project overview
```

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/CryptVenture/Comms/issues)
- **Discussions**: [GitHub Discussions](https://github.com/CryptVenture/Comms/discussions)
- **Documentation**: [README.md](./README.md) and [CLAUDE.md](./CLAUDE.md)

### Good First Issues

Look for issues labeled `good first issue` or `help wanted` to get started.

### Questions?

If you have questions about contributing:

1. Check existing documentation (README.md, CLAUDE.md)
2. Search existing issues and discussions
3. Create a new discussion or issue

## License

By contributing to WebVentures Comms SDK, you agree that your contributions will be licensed under the MIT License.

## Recognition

All contributors will be recognized in our README.md and release notes. Thank you for making this project better! 🎉

---

**Happy Contributing!** 🚀
