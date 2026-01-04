import { test } from 'vitest'

// Re-export from setup file for backward compatibility
export { mockHttp as default, mockResponse } from '../setup'

test('not a test', () => {})
