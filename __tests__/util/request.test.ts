import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'

// Unmock the request module (which is mocked by __tests__/setup.ts)
// so we can test the actual implementation
vi.unmock('../../src/util/request')

// Create mock undici request function in hoisted scope
const { mockUndiciRequest } = vi.hoisted(() => {
  return {
    mockUndiciRequest: vi.fn(),
  }
})

// Mock undici
vi.mock('undici', () => ({
  request: mockUndiciRequest,
  Dispatcher: class {},
}))

// Import after mocking (now uses the real request with mocked undici)
import request, { RequestError } from '../../src/util/request'

/**
 * Helper to create a mock undici response
 */
function createMockResponse(statusCode: number, body: string) {
  // Create a readable async iterable from the body string
  const chunks = [Buffer.from(body)]
  const readable = {
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) {
        yield chunk
      }
    },
  }

  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: readable,
  }
}

/**
 * Helper to create a network error (no status code)
 */
function createNetworkError(message: string) {
  const error = new Error(message)
  error.name = 'NetworkError'
  return error
}

describe('request with retry options', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockUndiciRequest.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('successful requests without retry', () => {
    test('returns response on first attempt when successful', async () => {
      mockUndiciRequest.mockResolvedValueOnce(createMockResponse(200, '{"data":"test"}'))

      const response = await request('https://api.example.com/data')

      expect(response.status).toBe(200)
      expect(mockUndiciRequest).toHaveBeenCalledTimes(1)
    })

    test('does not retry when retry option is not provided', async () => {
      mockUndiciRequest.mockRejectedValueOnce(new Error('Network error'))

      await expect(request('https://api.example.com/data')).rejects.toThrow('Network error')
      expect(mockUndiciRequest).toHaveBeenCalledTimes(1)
    })
  })

  describe('successful retry after failure', () => {
    test('retries and succeeds on GET request after 503', async () => {
      // First call fails with retryable status (uses throwOnError to preserve statusCode)
      mockUndiciRequest.mockResolvedValueOnce(createMockResponse(503, '{"error":"Service Unavailable"}'))
      // Second call succeeds
      mockUndiciRequest.mockResolvedValueOnce(createMockResponse(200, '{"data":"success"}'))

      const resultPromise = request('https://api.example.com/data', {
        method: 'GET',
        retry: { maxRetries: 3, jitter: false },
        throwOnError: true,
      })

      // Advance timer for first retry delay (1000ms for attempt 1)
      await vi.advanceTimersByTimeAsync(1000)

      const response = await resultPromise

      expect(response.status).toBe(200)
      expect(mockUndiciRequest).toHaveBeenCalledTimes(2)
    })

    test('retries and succeeds after network error (no status code)', async () => {
      mockUndiciRequest.mockRejectedValueOnce(createNetworkError('ECONNREFUSED'))
      mockUndiciRequest.mockResolvedValueOnce(createMockResponse(200, '{"ok":true}'))

      const resultPromise = request('https://api.example.com/data', {
        retry: { maxRetries: 2, jitter: false },
      })

      await vi.advanceTimersByTimeAsync(1000)

      const response = await resultPromise

      expect(response.status).toBe(200)
      expect(mockUndiciRequest).toHaveBeenCalledTimes(2)
    })

    test('retries multiple times before succeeding', async () => {
      // Use throwOnError with status codes to trigger retryable errors
      mockUndiciRequest.mockResolvedValueOnce(createMockResponse(503, '{}'))
      mockUndiciRequest.mockResolvedValueOnce(createMockResponse(429, '{}'))
      mockUndiciRequest.mockResolvedValueOnce(createMockResponse(200, '{}'))

      const resultPromise = request('https://api.example.com/data', {
        retry: { maxRetries: 3, jitter: false },
        throwOnError: true,
      })

      // First retry delay: 1000ms
      await vi.advanceTimersByTimeAsync(1000)
      // Second retry delay: 2000ms
      await vi.advanceTimersByTimeAsync(2000)

      const response = await resultPromise

      expect(response.status).toBe(200)
      expect(mockUndiciRequest).toHaveBeenCalledTimes(3)
    })
  })

  describe('retry exhaustion', () => {
    test('throws after exhausting all retries', async () => {
      // Always return 500 to trigger retries
      mockUndiciRequest.mockResolvedValue(createMockResponse(500, '{"error":"Server error"}'))

      const resultPromise = request('https://api.example.com/data', {
        retry: { maxRetries: 2, jitter: false },
        throwOnError: true,
      })

      // Setup rejection expectation first
      const expectation = expect(resultPromise).rejects.toThrow('HTTP 500')

      // Run all timers to complete all retries
      await vi.runAllTimersAsync()

      await expectation

      // 1 initial + 2 retries = 3 calls
      expect(mockUndiciRequest).toHaveBeenCalledTimes(3)
    })

    test('throws immediately when maxRetries is 0', async () => {
      mockUndiciRequest.mockResolvedValueOnce(createMockResponse(500, '{"error":"Server error"}'))

      await expect(
        request('https://api.example.com/data', {
          retry: { maxRetries: 0 },
          throwOnError: true,
        })
      ).rejects.toThrow('HTTP 500')

      expect(mockUndiciRequest).toHaveBeenCalledTimes(1)
    })
  })

  describe('retryable status codes', () => {
    test.each([408, 429, 500, 502, 503, 504])('retries on status code %i', async (statusCode) => {
      mockUndiciRequest.mockResolvedValueOnce(createMockResponse(statusCode, '{}'))
      mockUndiciRequest.mockResolvedValueOnce(createMockResponse(200, '{}'))

      const resultPromise = request('https://api.example.com/data', {
        retry: { maxRetries: 1, jitter: false },
        throwOnError: true,
      })

      await vi.advanceTimersByTimeAsync(1000)

      const response = await resultPromise

      expect(response.status).toBe(200)
      expect(mockUndiciRequest).toHaveBeenCalledTimes(2)
    })

    test('does not retry on 400 Bad Request', async () => {
      mockUndiciRequest.mockResolvedValueOnce(createMockResponse(400, '{"error":"Bad Request"}'))

      await expect(
        request('https://api.example.com/data', {
          retry: { maxRetries: 3 },
          throwOnError: true,
        })
      ).rejects.toThrow('HTTP 400')

      expect(mockUndiciRequest).toHaveBeenCalledTimes(1)
    })

    test('does not retry on 401 Unauthorized', async () => {
      mockUndiciRequest.mockResolvedValueOnce(createMockResponse(401, '{"error":"Unauthorized"}'))

      await expect(
        request('https://api.example.com/data', {
          retry: { maxRetries: 3 },
          throwOnError: true,
        })
      ).rejects.toThrow('HTTP 401')

      expect(mockUndiciRequest).toHaveBeenCalledTimes(1)
    })

    test('does not retry on 403 Forbidden', async () => {
      mockUndiciRequest.mockResolvedValueOnce(createMockResponse(403, '{"error":"Forbidden"}'))

      await expect(
        request('https://api.example.com/data', {
          retry: { maxRetries: 3 },
          throwOnError: true,
        })
      ).rejects.toThrow('HTTP 403')

      expect(mockUndiciRequest).toHaveBeenCalledTimes(1)
    })

    test('does not retry on 404 Not Found', async () => {
      mockUndiciRequest.mockResolvedValueOnce(createMockResponse(404, '{"error":"Not Found"}'))

      await expect(
        request('https://api.example.com/data', {
          retry: { maxRetries: 3 },
          throwOnError: true,
        })
      ).rejects.toThrow('HTTP 404')

      expect(mockUndiciRequest).toHaveBeenCalledTimes(1)
    })

    test('uses custom retryableStatusCodes', async () => {
      // Custom status code 418 (I'm a teapot) is retryable
      mockUndiciRequest.mockResolvedValueOnce(createMockResponse(418, '{}'))
      mockUndiciRequest.mockResolvedValueOnce(createMockResponse(200, '{}'))

      const resultPromise = request('https://api.example.com/data', {
        retry: {
          maxRetries: 1,
          jitter: false,
          retryableStatusCodes: [418],
        },
        throwOnError: true,
      })

      await vi.advanceTimersByTimeAsync(1000)

      const response = await resultPromise

      expect(response.status).toBe(200)
      expect(mockUndiciRequest).toHaveBeenCalledTimes(2)
    })
  })

  describe('safe vs unsafe HTTP methods', () => {
    test('GET requests retry by default', async () => {
      mockUndiciRequest.mockResolvedValueOnce(createMockResponse(503, '{}'))
      mockUndiciRequest.mockResolvedValueOnce(createMockResponse(200, '{}'))

      const resultPromise = request('https://api.example.com/data', {
        method: 'GET',
        retry: { maxRetries: 1, jitter: false },
        throwOnError: true,
      })

      await vi.advanceTimersByTimeAsync(1000)

      const response = await resultPromise
      expect(response.status).toBe(200)
      expect(mockUndiciRequest).toHaveBeenCalledTimes(2)
    })

    test('HEAD requests retry by default', async () => {
      mockUndiciRequest.mockResolvedValueOnce(createMockResponse(503, ''))
      mockUndiciRequest.mockResolvedValueOnce(createMockResponse(200, ''))

      const resultPromise = request('https://api.example.com/data', {
        method: 'HEAD',
        retry: { maxRetries: 1, jitter: false },
        throwOnError: true,
      })

      await vi.advanceTimersByTimeAsync(1000)

      const response = await resultPromise
      expect(response.status).toBe(200)
      expect(mockUndiciRequest).toHaveBeenCalledTimes(2)
    })

    test('OPTIONS requests retry by default', async () => {
      mockUndiciRequest.mockResolvedValueOnce(createMockResponse(503, ''))
      mockUndiciRequest.mockResolvedValueOnce(createMockResponse(200, ''))

      const resultPromise = request('https://api.example.com/data', {
        method: 'OPTIONS',
        retry: { maxRetries: 1, jitter: false },
        throwOnError: true,
      })

      await vi.advanceTimersByTimeAsync(1000)

      const response = await resultPromise
      expect(response.status).toBe(200)
      expect(mockUndiciRequest).toHaveBeenCalledTimes(2)
    })

    test('POST requests do NOT retry by default (unsafe method)', async () => {
      mockUndiciRequest.mockResolvedValueOnce(createMockResponse(503, '{}'))

      await expect(
        request('https://api.example.com/data', {
          method: 'POST',
          body: '{"data":"test"}',
          retry: { maxRetries: 3 },
          throwOnError: true,
        })
      ).rejects.toThrow('HTTP 503')

      expect(mockUndiciRequest).toHaveBeenCalledTimes(1)
    })

    test('PUT requests do NOT retry by default (unsafe method)', async () => {
      mockUndiciRequest.mockResolvedValueOnce(createMockResponse(503, '{}'))

      await expect(
        request('https://api.example.com/data', {
          method: 'PUT',
          body: '{"data":"test"}',
          retry: { maxRetries: 3 },
          throwOnError: true,
        })
      ).rejects.toThrow('HTTP 503')

      expect(mockUndiciRequest).toHaveBeenCalledTimes(1)
    })

    test('DELETE requests do NOT retry by default (unsafe method)', async () => {
      mockUndiciRequest.mockResolvedValueOnce(createMockResponse(503, '{}'))

      await expect(
        request('https://api.example.com/data', {
          method: 'DELETE',
          retry: { maxRetries: 3 },
          throwOnError: true,
        })
      ).rejects.toThrow('HTTP 503')

      expect(mockUndiciRequest).toHaveBeenCalledTimes(1)
    })

    test('PATCH requests do NOT retry by default (unsafe method)', async () => {
      mockUndiciRequest.mockResolvedValueOnce(createMockResponse(503, '{}'))

      await expect(
        request('https://api.example.com/data', {
          method: 'PATCH',
          body: '{"data":"test"}',
          retry: { maxRetries: 3 },
          throwOnError: true,
        })
      ).rejects.toThrow('HTTP 503')

      expect(mockUndiciRequest).toHaveBeenCalledTimes(1)
    })

    test('POST can retry with custom shouldRetry callback', async () => {
      mockUndiciRequest.mockResolvedValueOnce(createMockResponse(503, '{}'))
      mockUndiciRequest.mockResolvedValueOnce(createMockResponse(200, '{}'))

      const resultPromise = request('https://api.example.com/data', {
        method: 'POST',
        body: '{}',
        retry: {
          maxRetries: 1,
          jitter: false,
          shouldRetry: ({ statusCode }) => statusCode === 503,
        },
        throwOnError: true,
      })

      await vi.advanceTimersByTimeAsync(1000)

      const response = await resultPromise
      expect(response.status).toBe(200)
      expect(mockUndiciRequest).toHaveBeenCalledTimes(2)
    })
  })

  describe('throwOnError integration', () => {
    test('retries on error status when throwOnError is true', async () => {
      // First call returns 503 status
      mockUndiciRequest.mockResolvedValueOnce(createMockResponse(503, '{"error":"Service Unavailable"}'))
      // Second call succeeds
      mockUndiciRequest.mockResolvedValueOnce(createMockResponse(200, '{"ok":true}'))

      const resultPromise = request('https://api.example.com/data', {
        throwOnError: true,
        retry: { maxRetries: 1, jitter: false },
      })

      await vi.advanceTimersByTimeAsync(1000)

      const response = await resultPromise

      expect(response.status).toBe(200)
      expect(mockUndiciRequest).toHaveBeenCalledTimes(2)
    })

    test('does NOT retry on error status when throwOnError is false (returns response)', async () => {
      mockUndiciRequest.mockResolvedValueOnce(createMockResponse(503, '{"error":"Service Unavailable"}'))

      const response = await request('https://api.example.com/data', {
        throwOnError: false,
        retry: { maxRetries: 3, jitter: false },
      })

      // Should return the response without retrying
      expect(response.status).toBe(503)
      expect(mockUndiciRequest).toHaveBeenCalledTimes(1)
    })
  })

  describe('onRetry callback', () => {
    test('calls onRetry before each retry attempt', async () => {
      mockUndiciRequest.mockResolvedValueOnce(createMockResponse(503, '{}'))
      mockUndiciRequest.mockResolvedValueOnce(createMockResponse(502, '{}'))
      mockUndiciRequest.mockResolvedValueOnce(createMockResponse(200, '{}'))

      const onRetry = vi.fn()

      const resultPromise = request('https://api.example.com/data', {
        retry: {
          maxRetries: 3,
          jitter: false,
          baseDelay: 1000,
          onRetry,
        },
        throwOnError: true,
      })

      // First retry
      await vi.advanceTimersByTimeAsync(1000)
      // Second retry
      await vi.advanceTimersByTimeAsync(2000)

      await resultPromise

      expect(onRetry).toHaveBeenCalledTimes(2)
      expect(onRetry).toHaveBeenNthCalledWith(1, {
        attempt: 1,
        error: expect.objectContaining({ message: expect.stringContaining('503') }),
        delay: 1000,
      })
      expect(onRetry).toHaveBeenNthCalledWith(2, {
        attempt: 2,
        error: expect.objectContaining({ message: expect.stringContaining('502') }),
        delay: 2000,
      })
    })

    test('onRetry not called on successful first attempt', async () => {
      mockUndiciRequest.mockResolvedValueOnce(createMockResponse(200, '{}'))

      const onRetry = vi.fn()

      await request('https://api.example.com/data', {
        retry: { maxRetries: 3, onRetry },
      })

      expect(onRetry).not.toHaveBeenCalled()
    })
  })

  describe('AbortSignal propagation', () => {
    test('propagates signal from request options to retry', async () => {
      const controller = new AbortController()
      controller.abort()

      await expect(
        request('https://api.example.com/data', {
          signal: controller.signal,
          retry: { maxRetries: 3 },
        })
      ).rejects.toThrow('Operation aborted')

      // Should not even attempt the request
      expect(mockUndiciRequest).not.toHaveBeenCalled()
    })

    test('can abort during retry delay', async () => {
      const controller = new AbortController()

      mockUndiciRequest.mockResolvedValueOnce(createMockResponse(503, '{}'))

      const resultPromise = request('https://api.example.com/data', {
        signal: controller.signal,
        retry: { maxRetries: 3, jitter: false },
        throwOnError: true,
      })

      // Let first attempt execute and fail
      await vi.advanceTimersByTimeAsync(0)
      // Advance into delay period then abort
      vi.advanceTimersByTime(500)
      controller.abort()

      await expect(resultPromise).rejects.toThrow('Delay aborted')

      expect(mockUndiciRequest).toHaveBeenCalledTimes(1)
    })
  })

  describe('exponential backoff timing', () => {
    test('uses exponential backoff for retry delays', async () => {
      mockUndiciRequest.mockResolvedValue(createMockResponse(500, '{}'))

      const onRetry = vi.fn()

      const resultPromise = request('https://api.example.com/data', {
        retry: {
          maxRetries: 3,
          baseDelay: 100,
          jitter: false,
          onRetry,
        },
        throwOnError: true,
      })

      // Setup rejection expectation
      const expectation = expect(resultPromise).rejects.toThrow('HTTP 500')

      await vi.runAllTimersAsync()

      await expectation

      // Verify exponential backoff: 100ms, 200ms, 400ms
      expect(onRetry).toHaveBeenCalledTimes(3)
      expect(onRetry).toHaveBeenNthCalledWith(1, expect.objectContaining({ delay: 100 }))
      expect(onRetry).toHaveBeenNthCalledWith(2, expect.objectContaining({ delay: 200 }))
      expect(onRetry).toHaveBeenNthCalledWith(3, expect.objectContaining({ delay: 400 }))
    })

    test('respects maxDelay cap', async () => {
      mockUndiciRequest.mockResolvedValue(createMockResponse(500, '{}'))

      const onRetry = vi.fn()

      const resultPromise = request('https://api.example.com/data', {
        retry: {
          maxRetries: 5,
          baseDelay: 1000,
          maxDelay: 2500,
          jitter: false,
          onRetry,
        },
        throwOnError: true,
      })

      const expectation = expect(resultPromise).rejects.toThrow()

      await vi.runAllTimersAsync()

      await expectation

      // Delays should be capped at 2500ms
      // Normal would be: 1000, 2000, 4000, 8000, 16000
      // Capped at 2500: 1000, 2000, 2500, 2500, 2500
      expect(onRetry).toHaveBeenCalledTimes(5)
      expect(onRetry).toHaveBeenNthCalledWith(1, expect.objectContaining({ delay: 1000 }))
      expect(onRetry).toHaveBeenNthCalledWith(2, expect.objectContaining({ delay: 2000 }))
      expect(onRetry).toHaveBeenNthCalledWith(3, expect.objectContaining({ delay: 2500 }))
      expect(onRetry).toHaveBeenNthCalledWith(4, expect.objectContaining({ delay: 2500 }))
      expect(onRetry).toHaveBeenNthCalledWith(5, expect.objectContaining({ delay: 2500 }))
    })
  })

  describe('error handling', () => {
    test('preserves original error details after retries exhausted', async () => {
      mockUndiciRequest.mockResolvedValue(createMockResponse(500, '{}'))

      const resultPromise = request('https://api.example.com/data', {
        retry: { maxRetries: 1, jitter: false },
        throwOnError: true,
      })

      // Add catch handler to prevent unhandled rejection
      let caughtError: Error | undefined
      resultPromise.catch((e) => {
        caughtError = e
      })

      await vi.runAllTimersAsync()

      expect(caughtError).toBeDefined()
      expect(caughtError?.message).toContain('HTTP 500')
    })

    test('wraps non-RequestError errors', async () => {
      mockUndiciRequest.mockRejectedValueOnce(new Error('Generic network failure'))

      try {
        await request('https://api.example.com/data')
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(RequestError)
        expect((error as RequestError).message).toContain('Generic network failure')
      }
    })
  })

  describe('URL validation', () => {
    test('throws RequestError for invalid URL (does not retry)', async () => {
      await expect(
        request('not-a-valid-url', {
          retry: { maxRetries: 3 },
        })
      ).rejects.toThrow('Invalid URL')

      // Should not attempt any network requests for invalid URLs
      expect(mockUndiciRequest).not.toHaveBeenCalled()
    })

    test('throws RequestError for empty URL (does not retry)', async () => {
      await expect(
        request('', {
          retry: { maxRetries: 3 },
        })
      ).rejects.toThrow('Invalid URL')

      expect(mockUndiciRequest).not.toHaveBeenCalled()
    })
  })

  describe('network errors with retry', () => {
    test('retries on network errors without status code', async () => {
      mockUndiciRequest.mockRejectedValueOnce(createNetworkError('ECONNRESET'))
      mockUndiciRequest.mockResolvedValueOnce(createMockResponse(200, '{}'))

      const resultPromise = request('https://api.example.com/data', {
        retry: { maxRetries: 2, jitter: false },
      })

      await vi.advanceTimersByTimeAsync(1000)

      const response = await resultPromise
      expect(response.status).toBe(200)
      expect(mockUndiciRequest).toHaveBeenCalledTimes(2)
    })

    test('retries on timeout errors', async () => {
      mockUndiciRequest.mockRejectedValueOnce(new Error('ETIMEDOUT'))
      mockUndiciRequest.mockResolvedValueOnce(createMockResponse(200, '{}'))

      const resultPromise = request('https://api.example.com/data', {
        retry: { maxRetries: 2, jitter: false },
      })

      await vi.advanceTimersByTimeAsync(1000)

      const response = await resultPromise
      expect(response.status).toBe(200)
      expect(mockUndiciRequest).toHaveBeenCalledTimes(2)
    })
  })
})
