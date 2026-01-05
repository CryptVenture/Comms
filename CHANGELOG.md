## [2.0.1] - 2026-01-05

### Added
- Telegram notification provider with Bot API integration
- Postmark email provider for enhanced email delivery
- Priority-weighted multi-provider strategy for load balancing across notification channels
- Request retry utility with exponential backoff and jitter support
- Type predicate functions for improved type narrowing in responses
- Comprehensive JSDoc documentation for all exported functions and interfaces
- AWS key rotation and SMTP TLS certificate vulnerability fixes
- GDPR-compliant logging redaction for sensitive data

### Changed
- Standardized error handling across codebase with ConfigurationError and NetworkError types
- Improved type guards to return type predicates for better TypeScript type narrowing
- Enhanced SDK configuration validation at construction time
- Updated documentation with retry utility and type narrowing examples

### Fixed
- SDK configuration and error handling consistency across all providers and adapters
- Type safety improvements in strategy implementations
- Test compatibility with new error handling standards