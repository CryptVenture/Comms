# Build and Release Scripts

This directory contains scripts used during the build and release process.

## update-docs-version.js

Automatically updates version numbers in documentation files during releases.

### Usage

This script is automatically executed by semantic-release during the release process. It can also be run manually:

```bash
node scripts/update-docs-version.js
```

### What it does

1. Reads the current version from `package.json`
2. Updates version references in all documentation files:
   - `docs/API.md`
   - `docs/ARCHITECTURE.md`
   - `docs/EXAMPLES.md`
   - `docs/FRAMEWORKS.md`
   - `docs/MIGRATION.md`
   - `docs/PROVIDERS.md`

3. Replaces the following patterns:
   - `v2.0.x` → `v{newVersion}`
   - `Version 2.0.x` → `Version {newVersion}`
   - `version: '2.0.x'` → `version: '{newVersion}'`
   - `value: '2.0.x'` → `value: '{newVersion}'`

### Integration with semantic-release

The script is configured in `.releaserc.json` to run during the `prepare` phase, before committing the release. This ensures all documentation is up-to-date with the new version before the release is tagged.
