#!/usr/bin/env node

/**
 * Update version numbers in documentation files
 * This script is run automatically by semantic-release during the release process
 */

const fs = require('fs')
const path = require('path')

// Get new version from package.json
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'))
const newVersion = pkg.version

console.log(`Updating documentation to version ${newVersion}...`)

// Files to update
const docsDir = path.join(__dirname, '../docs')
const docFiles = [
  'API.md',
  'ARCHITECTURE.md',
  'EXAMPLES.md',
  'FRAMEWORKS.md',
  'MIGRATION.md',
  'PROVIDERS.md',
]

// Version patterns to replace
const patterns = [
  // Match "v2.0.x" or "2.0.x"
  { regex: /v\d+\.\d+\.\d+/g, replacement: `v${newVersion}` },
  { regex: /Version \d+\.\d+\.\d+/g, replacement: `Version ${newVersion}` },
  { regex: /version: '\d+\.\d+\.\d+'/g, replacement: `version: '${newVersion}'` },
  { regex: /value: '\d+\.\d+\.\d+'/g, replacement: `value: '${newVersion}'` },
  // Match "v1.x to v2.0.x" in migration guide
  {
    regex: /v1\.x to v\d+\.\d+\.\d+/g,
    replacement: `v1.x to v${newVersion}`,
  },
]

let totalReplacements = 0

docFiles.forEach((file) => {
  const filePath = path.join(docsDir, file)

  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠️  Skipping ${file} (not found)`)
    return
  }

  let content = fs.readFileSync(filePath, 'utf-8')
  let fileReplacements = 0

  patterns.forEach((pattern) => {
    const matches = content.match(pattern.regex)
    if (matches) {
      fileReplacements += matches.length
      content = content.replace(pattern.regex, pattern.replacement)
    }
  })

  if (fileReplacements > 0) {
    fs.writeFileSync(filePath, content, 'utf-8')
    console.log(`  ✓ Updated ${file} (${fileReplacements} replacements)`)
    totalReplacements += fileReplacements
  } else {
    console.log(`  - No changes needed in ${file}`)
  }
})

console.log(
  `\n✓ Documentation updated: ${totalReplacements} version references updated to ${newVersion}`
)
