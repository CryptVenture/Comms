/**
 * React 19 adapter
 * Provides hooks and utilities for React 19 applications
 */

import { NetworkError } from '../types/errors'

/**
 * Note: WebVentures Comms SDK should NOT be used directly in React client components
 * as it requires API keys and server-side execution.
 *
 * For React 19 with Next.js, use Server Actions:
 * @see ./nextjs.ts
 *
 * For React with a separate backend, call your API:
 *
 * @example
 * import { useCommsBackend } from '@webventures/comms/adapters'
 *
 * function MyComponent() {
 *   const { send, loading, error } = useCommsBackend('https://api.example.com')
 *
 *   const handleSend = async () => {
 *     await send({
 *       email: {from: 'noreply@example.com', to: 'user@example.com', subject: 'Hello', text: 'Hi!'}
 *     })
 *   }
 *
 *   return <button onClick={handleSend} disabled={loading}>Send Email</button>
 * }
 */

/**
 * React hook for calling WebVentures Comms backend API
 * This is a helper for client-side React components to call a backend API
 */
export function useCommsBackend(baseUrl: string) {
  // Note: In a real implementation, you'd use React hooks here
  // For now, this is a placeholder showing the intended API

  const send = async (notification: unknown) => {
    const response = await globalThis.fetch(`${baseUrl}/notifications/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notification),
    })

    if (!response.ok) {
      throw new NetworkError(`Failed to send notification: ${response.statusText}`, response.status)
    }

    return response.json()
  }

  return {
    send,
    // In real implementation: loading, error states
  }
}

/**
 * Check if React 19+ is available
 */
export function isReact19(): boolean {
  try {
    // @ts-expect-error - React version check
    const React = globalThis.React
    if (!React) return false

    const version = React.version
    if (!version) return false

    const major = parseInt(version.split('.')[0] ?? '0', 10)
    return major >= 19
  } catch {
    return false
  }
}
