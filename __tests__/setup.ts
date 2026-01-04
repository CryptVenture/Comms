import { vi, beforeEach } from 'vitest'

// Storage for request details and mock responses
export let mockResponseQueue: Array<{ statusCode: number; body: string }> = []

export function mockResponse(statusCode: number, body: string) {
  mockResponseQueue.push({ statusCode, body })
}

// Create the mock function in a hoisted scope
// This is required by Vitest for variables used in vi.mock()
const { mockRequest, getMockState, resetMockState } = vi.hoisted(() => {
  let requestBody: string | undefined
  let requestUrl: string | undefined
  let requestOptions: any

  const mockRequest = vi.fn(async (url: string, options?: any) => {
    // Store request details for test assertions
    requestUrl = url
    requestOptions = options || {}

    // Capture the request body
    if (requestOptions.body) {
      if (Buffer.isBuffer(requestOptions.body)) {
        requestBody = requestOptions.body.toString('utf8')
      } else if (typeof requestOptions.body === 'string') {
        requestBody = requestOptions.body
      } else if (requestOptions.body && typeof requestOptions.body.getBuffer === 'function') {
        // Handle form-data
        requestBody = requestOptions.body.getBuffer().toString('utf8')
      }
    }

    // Use queued response or default
    const mockResp = mockResponseQueue.shift() || { statusCode: 200, body: '{}' }

    // Create a standard Response object
    const response = new globalThis.Response(mockResp.body, {
      status: mockResp.statusCode,
      statusText: mockResp.statusCode === 200 ? 'OK' : 'Error',
      headers: {
        'content-type': mockResp.statusCode === 200 ? 'application/json' : 'text/plain',
      },
    })

    return response
  })

  return {
    mockRequest,
    getMockState: () => ({ requestBody, requestUrl, requestOptions }),
    resetMockState: () => {
      requestBody = undefined
      requestUrl = undefined
      requestOptions = undefined
      while (mockResponseQueue.length > 0) {
        mockResponseQueue.shift()
      }
    },
  }
})

// Mock the request utility module (not undici directly)
vi.mock('../src/util/request', () => ({
  default: mockRequest,
  RequestError: class RequestError extends Error {
    constructor(
      message: string,
      public statusCode?: number,
      public url?: string,
      cause?: unknown
    ) {
      super(message)
      this.name = 'RequestError'
      this.cause = cause
    }
  },
}))

// Helper to transform raw call arguments to the format tests expect
function transformCallArgs(args: any[]): any[] {
  if (!args || args.length === 0) return args

  const [url, options] = args

  if (typeof url !== 'string') {
    return args
  }

  try {
    const parsedUrl = new globalThis.URL(url)
    const opts = options || {}

    const transformedHeaders: Record<string, string[]> = {}
    if (opts?.headers) {
      Object.entries(opts.headers as Record<string, string | string[]>).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          transformedHeaders[key] = value
        } else {
          transformedHeaders[key] = [value]
        }
      })
    }

    // Handle form-data body headers
    if (opts?.body && typeof opts.body === 'object' && typeof opts.body.getHeaders === 'function') {
      const formHeaders = opts.body.getHeaders()
      Object.entries(formHeaders).forEach(([key, value]) => {
        // Normalize header keys to capitalized form (content-type -> Content-Type)
        const normalizedKey = key
          .split('-')
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
          .join('-')
        if (!transformedHeaders[normalizedKey]) {
          transformedHeaders[normalizedKey] = Array.isArray(value) ? value : [value as string]
        }
      })
      // Add Content-Length from form-data
      const buffer = opts.body.getBuffer()
      if (buffer && !transformedHeaders['Content-Length']) {
        transformedHeaders['Content-Length'] = [buffer.length.toString()]
      }
      // Add Accept header if not present
      if (!transformedHeaders['Accept']) {
        transformedHeaders['Accept'] = ['*/*']
      }
    }

    return [
      {
        hostname: parsedUrl.hostname,
        protocol: parsedUrl.protocol,
        path: parsedUrl.pathname + parsedUrl.search,
        href: parsedUrl.href,
        method: opts?.method || 'GET',
        headers: transformedHeaders,
      },
    ]
  } catch {
    // If transformation fails, return original args
    return args
  }
}

// Create a proxy that transforms calls when they're read
export const mockHttp = new Proxy(mockRequest, {
  get(target, prop) {
    if (prop === 'mock') {
      return new Proxy(target.mock, {
        get(mockTarget, mockProp) {
          if (mockProp === 'calls') {
            // Transform all calls when accessed
            return mockTarget.calls.map((call: any[]) => transformCallArgs(call))
          }
          if (mockProp === 'lastCall') {
            // Transform the last call when accessed
            const lastCall = mockTarget.lastCall
            return lastCall ? transformCallArgs(lastCall) : undefined
          }
          return mockTarget[mockProp as keyof typeof mockTarget]
        },
      })
    }
    // Check if it's the 'body' property
    if (prop === 'body') {
      return getMockState().requestBody
    }
    return target[prop as keyof typeof target]
  },
}) as typeof mockRequest

beforeEach(() => {
  mockResponseQueue = []
  resetMockState()
  mockRequest.mockClear()
})
