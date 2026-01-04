import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    // Export individual channels for tree-shaking
    'providers/email': 'src/providers/email/index.ts',
    'providers/sms': 'src/providers/sms/index.ts',
    'providers/push': 'src/providers/push/index.ts',
    'providers/voice': 'src/providers/voice/index.ts',
    'providers/webpush': 'src/providers/webpush/index.ts',
    'providers/slack': 'src/providers/slack/index.ts',
    'providers/whatsapp': 'src/providers/whatsapp/index.ts',
    // Export strategies
    'strategies/fallback': 'src/strategies/providers/fallback.ts',
    'strategies/roundrobin': 'src/strategies/providers/roundrobin.ts',
    'strategies/no-fallback': 'src/strategies/providers/no-fallback.ts',
  },
  format: ['cjs', 'esm'],
  dts: {
    resolve: true,
  },
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: false,
  target: 'es2022',
  outDir: 'dist',
  treeshake: true,
  platform: 'node',
  cjsInterop: true,
  external: ['nodemailer', 'winston', 'form-data', 'web-push', 'node-pushnotifications'],
  esbuildOptions(options) {
    options.banner = {
      js: `/**
 * @webventures/comms v2.0.0
 * WebVentures Comms SDK - Unified Communication SDK
 * (c) 2025 WebVentures
 * @license MIT
 */`,
    }
  },
})
