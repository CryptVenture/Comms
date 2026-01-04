import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  calculateBackoff,
  delay,
  withRetry,
  DEFAULT_RETRY_OPTIONS,
  DEFAULT_RETRYABLE_STATUS_CODES,
  getRetryOptionsWithDefaults,
  isRetryableStatusCode,
  getStatusCodeFromError,
} from '../../src/util/retry'

describe('calculateBackoff', () => {
  describe('exponential backoff calculation', () => {
    test('returns baseDelay for attempt 1 (no jitter)', () => {
      const result = calculateBackoff(1, { jitter: false })
      expect(result).toBe(DEFAULT_RETRY_OPTIONS.baseDelay) // 1000ms
    })

    test('doubles delay for each subsequent attempt', () => {
      const baseDelay = 1000
      expect(calculateBackoff(1, { jitter: false, baseDelay })).toBe(1000) // 1000 * 2^0
      expect(calculateBackoff(2, { jitter: false, baseDelay })).toBe(2000) // 1000 * 2^1
      expect(calculateBackoff(3, { jitter: false, baseDelay })).toBe(4000) // 1000 * 2^2
      expect(calculateBackoff(4, { jitter: false, baseDelay })).toBe(8000) // 1000 * 2^3
      expect(calculateBackoff(5, { jitter: false, baseDelay })).toBe(16000) // 1000 * 2^4
    })

    test('respects custom baseDelay', () => {
      expect(calculateBackoff(1, { jitter: false, baseDelay: 500 })).toBe(500)
      expect(calculateBackoff(2, { jitter: false, baseDelay: 500 })).toBe(1000)
      expect(calculateBackoff(3, { jitter: false, baseDelay: 500 })).toBe(2000)
    })

    test('caps at maxDelay', () => {
      const result = calculateBackoff(10, { jitter: false, maxDelay: 5000 })
      expect(result).toBe(5000)
    })

    test('high attempt numbers cap at maxDelay', () => {
      // 2^99 would be astronomically large, but should cap at maxDelay
      const result = calculateBackoff(100, { jitter: false, maxDelay: 30000 })
      expect(result).toBe(30000)
    })
  })

  describe('jitter behavior', () => {
    test('adds jitter within maxJitter bounds', () => {
      // Mock Math.random to return a fixed value
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5)

      const result = calculateBackoff(1, { jitter: true, maxJitter: 1000 })
      // baseDelay (1000) + 0.5 * maxJitter (500) = 1500
      expect(result).toBe(1500)

      randomSpy.mockRestore()
    })

    test('jitter adds minimum of 0 when random is 0', () => {
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)

      const result = calculateBackoff(1, { jitter: true, maxJitter: 1000 })
      expect(result).toBe(1000) // No jitter added

      randomSpy.mockRestore()
    })

    test('jitter adds maximum when random is near 1', () => {
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.999)

      const result = calculateBackoff(1, { jitter: true, maxJitter: 1000 })
      expect(result).toBeCloseTo(1999, 0)

      randomSpy.mockRestore()
    })

    test('respects custom maxJitter', () => {
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(1)

      const result = calculateBackoff(1, { jitter: true, maxJitter: 200 })
      expect(result).toBe(1200) // 1000 + 200

      randomSpy.mockRestore()
    })

    test('no jitter added when maxJitter is 0', () => {
      const randomSpy = vi.spyOn(Math, 'random')

      const result = calculateBackoff(1, { jitter: true, maxJitter: 0 })
      expect(result).toBe(1000)
      expect(randomSpy).not.toHaveBeenCalled()

      randomSpy.mockRestore()
    })

    test('jitter stays within bounds over many calls', () => {
      const results: number[] = []
      for (let i = 0; i < 100; i++) {
        results.push(calculateBackoff(1, { jitter: true, baseDelay: 1000, maxJitter: 500 }))
      }

      // All results should be between baseDelay and baseDelay + maxJitter
      results.forEach((result) => {
        expect(result).toBeGreaterThanOrEqual(1000)
        expect(result).toBeLessThanOrEqual(1500)
      })
    })
  })

  describe('edge cases', () => {
    test('normalizes attempt 0 to 1', () => {
      const result = calculateBackoff(0, { jitter: false })
      expect(result).toBe(1000) // Same as attempt 1
    })

    test('normalizes negative attempts to 1', () => {
      const result = calculateBackoff(-5, { jitter: false })
      expect(result).toBe(1000) // Same as attempt 1
    })

    test('handles very large maxDelay', () => {
      const result = calculateBackoff(1, { jitter: false, maxDelay: Number.MAX_SAFE_INTEGER })
      expect(result).toBe(1000)
    })

    test('uses default options when none provided', () => {
      const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)

      const result = calculateBackoff(1)
      expect(result).toBe(DEFAULT_RETRY_OPTIONS.baseDelay)

      randomSpy.mockRestore()
    })
  })
})

describe('delay', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('basic delay behavior', () => {
    test('resolves after specified duration', async () => {
      const start = Date.now()
      const delayPromise = delay(1000)

      // Advance timers
      await vi.advanceTimersByTimeAsync(1000)

      await delayPromise
      // Should have completed after 1000ms
      expect(Date.now() - start).toBeGreaterThanOrEqual(1000)
    })

    test('resolves immediately for 0ms delay', async () => {
      const delayPromise = delay(0)
      await vi.advanceTimersByTimeAsync(0)
      await delayPromise
      // Should complete without error
    })

    test('does not resolve before duration', async () => {
      let resolved = false
      const delayPromise = delay(1000).then(() => {
        resolved = true
      })

      await vi.advanceTimersByTimeAsync(500)
      expect(resolved).toBe(false)

      await vi.advanceTimersByTimeAsync(500)
      await delayPromise
      expect(resolved).toBe(true)
    })
  })

  describe('AbortSignal handling', () => {
    test('rejects immediately if signal already aborted', async () => {
      const controller = new AbortController()
      controller.abort()

      await expect(delay(1000, controller.signal)).rejects.toThrow('Delay aborted')
    })

    test('aborted error has name AbortError', async () => {
      const controller = new AbortController()
      controller.abort()

      try {
        await delay(1000, controller.signal)
        expect.fail('Should have thrown')
      } catch (error) {
        expect((error as Error).name).toBe('AbortError')
      }
    })

    test('rejects when signal is aborted during delay', async () => {
      const controller = new AbortController()
      const delayPromise = delay(1000, controller.signal)

      // Advance time then abort
      vi.advanceTimersByTime(500)
      controller.abort()

      await expect(delayPromise).rejects.toThrow('Delay aborted')
    })

    test('cleans up abort listener after completion', async () => {
      const controller = new AbortController()
      const removeEventListenerSpy = vi.spyOn(controller.signal, 'removeEventListener')

      const delayPromise = delay(100, controller.signal)
      await vi.advanceTimersByTimeAsync(100)
      await delayPromise

      // Should have cleaned up the abort listener
      expect(removeEventListenerSpy).toHaveBeenCalledWith('abort', expect.any(Function))
    })

    test('works without AbortSignal', async () => {
      const delayPromise = delay(100)
      await vi.advanceTimersByTimeAsync(100)
      await delayPromise
      // Should complete without error
    })
  })
})

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('immediate success', () => {
    test('returns result on first attempt without retrying', async () => {
      const fn = vi.fn().mockResolvedValue('success')
      const onRetry = vi.fn()

      const result = await withRetry(fn, { maxRetries: 3, onRetry })

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(1)
      expect(onRetry).not.toHaveBeenCalled()
    })

    test('does not add delay on success', async () => {
      const fn = vi.fn().mockResolvedValue('success')

      const resultPromise = withRetry(fn, { maxRetries: 3 })
      const result = await resultPromise

      expect(result).toBe('success')
      // No need to advance timers for immediate success
    })
  })

  describe('maxRetries=0 (no retries)', () => {
    test('throws immediately on first failure', async () => {
      const error = new Error('First failure')
      const fn = vi.fn().mockRejectedValue(error)
      const onRetry = vi.fn()

      await expect(withRetry(fn, { maxRetries: 0, onRetry })).rejects.toThrow('First failure')

      expect(fn).toHaveBeenCalledTimes(1)
      expect(onRetry).not.toHaveBeenCalled()
    })

    test('returns result if first attempt succeeds', async () => {
      const fn = vi.fn().mockResolvedValue('success')

      const result = await withRetry(fn, { maxRetries: 0 })

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(1)
    })
  })

  describe('retry on failure', () => {
    test('retries specified number of times then throws', async () => {
      const error = new Error('Always fails')
      const fn = vi.fn().mockRejectedValue(error)
      const onRetry = vi.fn()

      const retryPromise = withRetry(fn, { maxRetries: 3, onRetry, jitter: false })

      // Setup rejection expectation first to prevent unhandled rejection warning
      const expectation = expect(retryPromise).rejects.toThrow('Always fails')

      // Run all timers to let all retries complete
      await vi.runAllTimersAsync()

      // Wait for the expectation to complete
      await expectation

      // 1 initial + 3 retries = 4 calls
      expect(fn).toHaveBeenCalledTimes(4)
      expect(onRetry).toHaveBeenCalledTimes(3)
    })

    test('succeeds after some retries', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success')

      const retryPromise = withRetry(fn, { maxRetries: 3, jitter: false })

      // Wait for first retry delay
      await vi.advanceTimersByTimeAsync(1000)
      // Wait for second retry delay
      await vi.advanceTimersByTimeAsync(2000)

      const result = await retryPromise

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(3) // 1 initial + 2 retries
    })

    test('calls onRetry with correct information', async () => {
      const error1 = new Error('Fail 1')
      const error2 = new Error('Fail 2')
      const fn = vi.fn().mockRejectedValueOnce(error1).mockRejectedValueOnce(error2).mockResolvedValue('success')

      const onRetry = vi.fn()

      const retryPromise = withRetry(fn, { maxRetries: 3, onRetry, jitter: false, baseDelay: 1000 })

      await vi.advanceTimersByTimeAsync(1000)
      await vi.advanceTimersByTimeAsync(2000)

      await retryPromise

      expect(onRetry).toHaveBeenCalledTimes(2)
      expect(onRetry).toHaveBeenNthCalledWith(1, {
        attempt: 1,
        error: error1,
        delay: 1000,
      })
      expect(onRetry).toHaveBeenNthCalledWith(2, {
        attempt: 2,
        error: error2,
        delay: 2000,
      })
    })
  })

  describe('retryable status codes', () => {
    test('retries on default retryable status codes', async () => {
      const errorWith503 = Object.assign(new Error('Service unavailable'), { statusCode: 503 })
      const fn = vi.fn().mockRejectedValueOnce(errorWith503).mockResolvedValue('success')

      const retryPromise = withRetry(fn, { maxRetries: 1, jitter: false })

      await vi.advanceTimersByTimeAsync(1000)
      const result = await retryPromise

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(2)
    })

    test('does not retry on non-retryable status codes', async () => {
      const errorWith400 = Object.assign(new Error('Bad request'), { statusCode: 400 })
      const fn = vi.fn().mockRejectedValue(errorWith400)

      await expect(withRetry(fn, { maxRetries: 3 })).rejects.toThrow('Bad request')

      expect(fn).toHaveBeenCalledTimes(1)
    })

    test('retries on custom retryableStatusCodes', async () => {
      const errorWith418 = Object.assign(new Error("I'm a teapot"), { statusCode: 418 })
      const fn = vi.fn().mockRejectedValueOnce(errorWith418).mockResolvedValue('success')

      const retryPromise = withRetry(fn, {
        maxRetries: 1,
        retryableStatusCodes: [418],
        jitter: false,
      })

      await vi.advanceTimersByTimeAsync(1000)
      const result = await retryPromise

      expect(result).toBe('success')
    })

    test.each(DEFAULT_RETRYABLE_STATUS_CODES)('retries on status code %i', async (statusCode) => {
      const error = Object.assign(new Error(`Error ${statusCode}`), { statusCode })
      const fn = vi.fn().mockRejectedValueOnce(error).mockResolvedValue('success')

      const retryPromise = withRetry(fn, { maxRetries: 1, jitter: false })

      await vi.advanceTimersByTimeAsync(1000)
      const result = await retryPromise

      expect(result).toBe('success')
    })
  })

  describe('network errors (no status code)', () => {
    test('retries on errors without status code by default', async () => {
      const networkError = new Error('ECONNREFUSED')
      const fn = vi.fn().mockRejectedValueOnce(networkError).mockResolvedValue('success')

      const retryPromise = withRetry(fn, { maxRetries: 1, jitter: false })

      await vi.advanceTimersByTimeAsync(1000)
      const result = await retryPromise

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(2)
    })

    test('retries on timeout errors', async () => {
      const timeoutError = new Error('ETIMEDOUT')
      const fn = vi.fn().mockRejectedValueOnce(timeoutError).mockResolvedValue('success')

      const retryPromise = withRetry(fn, { maxRetries: 1, jitter: false })

      await vi.advanceTimersByTimeAsync(1000)
      const result = await retryPromise

      expect(result).toBe('success')
    })
  })

  describe('custom shouldRetry callback', () => {
    test('uses shouldRetry callback instead of default logic', async () => {
      const error = Object.assign(new Error('Bad request'), { statusCode: 400 })
      const fn = vi.fn().mockRejectedValueOnce(error).mockResolvedValue('success')

      // Custom: retry even on 400
      const shouldRetry = vi.fn().mockReturnValue(true)

      const retryPromise = withRetry(fn, { maxRetries: 1, shouldRetry, jitter: false })

      await vi.advanceTimersByTimeAsync(1000)
      const result = await retryPromise

      expect(result).toBe('success')
      expect(shouldRetry).toHaveBeenCalledWith({
        attempt: 1,
        error,
        statusCode: 400,
      })
    })

    test('shouldRetry can stop retries', async () => {
      const error = Object.assign(new Error('Server error'), { statusCode: 500 })
      const fn = vi.fn().mockRejectedValue(error)

      // Custom: never retry
      const shouldRetry = vi.fn().mockReturnValue(false)

      await expect(withRetry(fn, { maxRetries: 3, shouldRetry })).rejects.toThrow('Server error')

      expect(fn).toHaveBeenCalledTimes(1)
      expect(shouldRetry).toHaveBeenCalledTimes(1)
    })

    test('shouldRetry receives attempt count', async () => {
      const error = new Error('Fail')
      const fn = vi.fn().mockRejectedValue(error)

      const shouldRetry = vi.fn().mockImplementation(({ attempt }) => attempt < 2)

      const retryPromise = withRetry(fn, { maxRetries: 5, shouldRetry, jitter: false })

      // Setup rejection expectation first to prevent unhandled rejection warning
      const expectation = expect(retryPromise).rejects.toThrow('Fail')

      // Run all timers to complete the retry process
      await vi.runAllTimersAsync()

      await expectation

      expect(shouldRetry).toHaveBeenCalledTimes(2)
      expect(shouldRetry).toHaveBeenNthCalledWith(1, { attempt: 1, error, statusCode: undefined })
      expect(shouldRetry).toHaveBeenNthCalledWith(2, { attempt: 2, error, statusCode: undefined })
    })
  })

  describe('AbortSignal handling', () => {
    test('throws immediately if signal already aborted', async () => {
      const controller = new AbortController()
      controller.abort()

      const fn = vi.fn().mockResolvedValue('success')

      await expect(withRetry(fn, { signal: controller.signal })).rejects.toThrow('Operation aborted')

      expect(fn).not.toHaveBeenCalled()
    })

    test('aborted error has name AbortError', async () => {
      const controller = new AbortController()
      controller.abort()

      const fn = vi.fn().mockResolvedValue('success')

      try {
        await withRetry(fn, { signal: controller.signal })
        expect.fail('Should have thrown')
      } catch (error) {
        expect((error as Error).name).toBe('AbortError')
      }
    })

    test('propagates AbortError from function without retrying', async () => {
      const abortError = new Error('Aborted by function')
      abortError.name = 'AbortError'

      const fn = vi.fn().mockRejectedValue(abortError)

      await expect(withRetry(fn, { maxRetries: 3 })).rejects.toThrow('Aborted by function')

      expect(fn).toHaveBeenCalledTimes(1)
    })

    test('can abort during retry delay', async () => {
      const controller = new AbortController()
      const error = new Error('Fail')
      const fn = vi.fn().mockRejectedValue(error)

      const retryPromise = withRetry(fn, {
        maxRetries: 3,
        signal: controller.signal,
        jitter: false,
      })

      // Wait for first attempt to fail, then abort during delay
      await vi.advanceTimersByTimeAsync(0) // Let the first attempt execute and fail
      vi.advanceTimersByTime(500) // Advance into the delay period
      controller.abort() // Abort during the delay

      await expect(retryPromise).rejects.toThrow('Delay aborted')
    })
  })

  describe('error handling edge cases', () => {
    test('converts non-Error throws to Error objects', async () => {
      const fn = vi.fn().mockRejectedValue('string error')
      const onRetry = vi.fn()

      const retryPromise = withRetry(fn, { maxRetries: 1, onRetry, jitter: false })

      // Setup rejection expectation first to prevent unhandled rejection warning
      const expectation = expect(retryPromise).rejects.toThrow('string error')

      // Run all timers to complete the retry process
      await vi.runAllTimersAsync()

      await expectation

      // onRetry should receive an Error object
      expect(onRetry.mock.calls[0]?.[0].error).toBeInstanceOf(Error)
    })

    test('preserves original error on final failure', async () => {
      const originalError = new Error('Original error')
      originalError.cause = 'some cause'

      const fn = vi.fn().mockRejectedValue(originalError)

      const retryPromise = withRetry(fn, { maxRetries: 1, jitter: false })

      // Add catch handler immediately to prevent unhandled rejection warning
      let caughtError: Error | undefined
      retryPromise.catch((e) => {
        caughtError = e
      })

      // Run all timers to complete the retry process
      await vi.runAllTimersAsync()

      // Verify the caught error is our original error
      expect(caughtError).toBe(originalError)
      expect(caughtError?.cause).toBe('some cause')
    })
  })
})

describe('getRetryOptionsWithDefaults', () => {
  test('returns all defaults when no options provided', () => {
    const result = getRetryOptionsWithDefaults()

    expect(result.maxRetries).toBe(DEFAULT_RETRY_OPTIONS.maxRetries)
    expect(result.baseDelay).toBe(DEFAULT_RETRY_OPTIONS.baseDelay)
    expect(result.maxDelay).toBe(DEFAULT_RETRY_OPTIONS.maxDelay)
    expect(result.jitter).toBe(DEFAULT_RETRY_OPTIONS.jitter)
    expect(result.maxJitter).toBe(DEFAULT_RETRY_OPTIONS.maxJitter)
    expect(result.retryableStatusCodes).toBe(DEFAULT_RETRYABLE_STATUS_CODES)
    expect(result.shouldRetry).toBeUndefined()
    expect(result.onRetry).toBeUndefined()
    expect(result.signal).toBeUndefined()
  })

  test('overrides specific options while keeping defaults', () => {
    const result = getRetryOptionsWithDefaults({ maxRetries: 5 })

    expect(result.maxRetries).toBe(5)
    expect(result.baseDelay).toBe(DEFAULT_RETRY_OPTIONS.baseDelay) // Default
  })

  test('preserves callback options', () => {
    const shouldRetry = vi.fn()
    const onRetry = vi.fn()
    const controller = new AbortController()

    const result = getRetryOptionsWithDefaults({
      shouldRetry,
      onRetry,
      signal: controller.signal,
    })

    expect(result.shouldRetry).toBe(shouldRetry)
    expect(result.onRetry).toBe(onRetry)
    expect(result.signal).toBe(controller.signal)
  })
})

describe('isRetryableStatusCode', () => {
  test('returns true for default retryable status codes', () => {
    expect(isRetryableStatusCode(408)).toBe(true)
    expect(isRetryableStatusCode(429)).toBe(true)
    expect(isRetryableStatusCode(500)).toBe(true)
    expect(isRetryableStatusCode(502)).toBe(true)
    expect(isRetryableStatusCode(503)).toBe(true)
    expect(isRetryableStatusCode(504)).toBe(true)
  })

  test('returns false for non-retryable status codes', () => {
    expect(isRetryableStatusCode(200)).toBe(false)
    expect(isRetryableStatusCode(400)).toBe(false)
    expect(isRetryableStatusCode(401)).toBe(false)
    expect(isRetryableStatusCode(403)).toBe(false)
    expect(isRetryableStatusCode(404)).toBe(false)
    expect(isRetryableStatusCode(501)).toBe(false)
  })

  test('returns false for undefined status code', () => {
    expect(isRetryableStatusCode(undefined)).toBe(false)
  })

  test('uses custom retryableStatusCodes list', () => {
    expect(isRetryableStatusCode(418, [418, 419])).toBe(true)
    expect(isRetryableStatusCode(500, [418, 419])).toBe(false)
  })
})

describe('getStatusCodeFromError', () => {
  test('extracts statusCode from error with statusCode property', () => {
    const error = Object.assign(new Error('Test'), { statusCode: 503 })
    expect(getStatusCodeFromError(error)).toBe(503)
  })

  test('extracts status from error with status property', () => {
    const error = Object.assign(new Error('Test'), { status: 500 })
    expect(getStatusCodeFromError(error)).toBe(500)
  })

  test('extracts status from error with response.status property', () => {
    const error = Object.assign(new Error('Test'), { response: { status: 429 } })
    expect(getStatusCodeFromError(error)).toBe(429)
  })

  test('prefers statusCode over status', () => {
    const error = Object.assign(new Error('Test'), { statusCode: 503, status: 500 })
    expect(getStatusCodeFromError(error)).toBe(503)
  })

  test('returns undefined for error without status code', () => {
    const error = new Error('No status')
    expect(getStatusCodeFromError(error)).toBeUndefined()
  })

  test('returns undefined for null', () => {
    expect(getStatusCodeFromError(null)).toBeUndefined()
  })

  test('returns undefined for non-object', () => {
    expect(getStatusCodeFromError('string error')).toBeUndefined()
    expect(getStatusCodeFromError(123)).toBeUndefined()
    expect(getStatusCodeFromError(undefined)).toBeUndefined()
  })

  test('returns undefined for non-numeric statusCode', () => {
    const error = Object.assign(new Error('Test'), { statusCode: '503' })
    expect(getStatusCodeFromError(error)).toBeUndefined()
  })
})
