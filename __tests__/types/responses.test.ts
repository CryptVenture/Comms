import { describe, test, expect } from 'vitest'
import {
  isSuccessResponse,
  isErrorResponse,
  getErrors,
  getChannelIds,
} from '../../src/types/responses'
import type {
  NotificationStatus,
  SuccessNotificationStatus,
  ErrorNotificationStatus,
  ChannelStatus,
} from '../../src/types/responses'

/**
 * These tests verify that the type guard functions correctly narrow
 * NotificationStatus to SuccessNotificationStatus or ErrorNotificationStatus.
 *
 * The tests validate both:
 * 1. Runtime behavior (the guards return correct boolean values)
 * 2. Compile-time type safety (TypeScript correctly narrows types in conditionals)
 *
 * If the type predicates were incorrect, these tests would fail to compile.
 */

describe('Type Guard Functions', () => {
  // Test fixtures
  const successResponse: NotificationStatus = {
    status: 'success',
    channels: {
      email: { id: 'msg-123', providerId: 'sendgrid' },
      sms: { id: 'sms-456', providerId: 'twilio' },
    },
  }

  const errorResponse: NotificationStatus = {
    status: 'error',
    errors: {
      email: new Error('Email provider failed'),
      sms: new Error('SMS provider failed'),
    },
  }

  const mixedResponse: NotificationStatus = {
    status: 'error',
    channels: {
      email: { id: 'msg-123', providerId: 'sendgrid' },
    },
    errors: {
      sms: new Error('SMS provider failed'),
    },
  }

  describe('isSuccessResponse', () => {
    test('returns true for success responses', () => {
      expect(isSuccessResponse(successResponse)).toBe(true)
    })

    test('returns false for error responses', () => {
      expect(isErrorResponse(errorResponse)).toBe(true)
      expect(isSuccessResponse(errorResponse)).toBe(false)
    })

    test('returns false for mixed responses (status is error)', () => {
      expect(isSuccessResponse(mixedResponse)).toBe(false)
    })

    test('narrows type to SuccessNotificationStatus with guaranteed channels property', () => {
      const response: NotificationStatus = successResponse

      if (isSuccessResponse(response)) {
        // TypeScript should narrow `response` to SuccessNotificationStatus
        // This means `channels` is guaranteed to be defined (not optional)
        // The following line would cause a compile error if type narrowing didn't work:
        const channels: Partial<Record<string, ChannelStatus>> = response.channels

        // Verify the channels property is accessible without optional chaining
        expect(channels).toBeDefined()
        expect(channels.email?.id).toBe('msg-123')

        // Verify status is narrowed to literal 'success'
        const status: 'success' = response.status
        expect(status).toBe('success')
      } else {
        // This branch should not execute
        expect.fail('Expected isSuccessResponse to return true')
      }
    })

    test('allows type-safe access to channel IDs after narrowing', () => {
      const response: NotificationStatus = successResponse

      if (isSuccessResponse(response)) {
        // After narrowing, we can safely access channels without optional chaining
        // because SuccessNotificationStatus guarantees channels is defined
        const emailChannel = response.channels.email
        expect(emailChannel?.id).toBe('msg-123')
        expect(emailChannel?.providerId).toBe('sendgrid')
      }
    })
  })

  describe('isErrorResponse', () => {
    test('returns true for error responses', () => {
      expect(isErrorResponse(errorResponse)).toBe(true)
    })

    test('returns false for success responses', () => {
      expect(isErrorResponse(successResponse)).toBe(false)
    })

    test('returns true for mixed responses (status is error)', () => {
      expect(isErrorResponse(mixedResponse)).toBe(true)
    })

    test('narrows type to ErrorNotificationStatus with guaranteed errors property', () => {
      const response: NotificationStatus = errorResponse

      if (isErrorResponse(response)) {
        // TypeScript should narrow `response` to ErrorNotificationStatus
        // This means `errors` is guaranteed to be defined (not optional)
        // The following line would cause a compile error if type narrowing didn't work:
        const errors: Partial<Record<string, Error>> = response.errors

        // Verify the errors property is accessible without optional chaining
        expect(errors).toBeDefined()
        expect(errors.email?.message).toBe('Email provider failed')

        // Verify status is narrowed to literal 'error'
        const status: 'error' = response.status
        expect(status).toBe('error')
      } else {
        // This branch should not execute
        expect.fail('Expected isErrorResponse to return true')
      }
    })

    test('allows type-safe access to error details after narrowing', () => {
      const response: NotificationStatus = errorResponse

      if (isErrorResponse(response)) {
        // After narrowing, we can safely access errors without optional chaining
        // because ErrorNotificationStatus guarantees errors is defined
        const emailError = response.errors.email
        expect(emailError).toBeInstanceOf(Error)
        expect(emailError?.message).toBe('Email provider failed')
      }
    })
  })

  describe('Type narrowing in conditional branches', () => {
    test('properly narrows in if-else branches', () => {
      const handleResponse = (response: NotificationStatus): string => {
        if (isSuccessResponse(response)) {
          // In this branch, response is SuccessNotificationStatus
          // channels is guaranteed to be defined
          return `Success: ${Object.keys(response.channels).length} channels`
        } else {
          // In this branch, TypeScript knows response is not SuccessNotificationStatus
          return `Not success: ${response.status}`
        }
      }

      expect(handleResponse(successResponse)).toBe('Success: 2 channels')
      expect(handleResponse(errorResponse)).toBe('Not success: error')
    })

    test('works with early return pattern', () => {
      const getChannelCount = (response: NotificationStatus): number | null => {
        if (!isSuccessResponse(response)) {
          return null
        }
        // After early return, response is narrowed to SuccessNotificationStatus
        return Object.keys(response.channels).length
      }

      expect(getChannelCount(successResponse)).toBe(2)
      expect(getChannelCount(errorResponse)).toBeNull()
    })

    test('works with ternary expressions', () => {
      const response: NotificationStatus = successResponse

      // Type narrowing works in ternary expressions too
      const result = isSuccessResponse(response)
        ? response.channels.email?.id // channels guaranteed to be defined
        : 'error'

      expect(result).toBe('msg-123')
    })
  })

  describe('getErrors helper function', () => {
    test('returns array of errors from error response', () => {
      const errors = getErrors(errorResponse)
      expect(errors).toHaveLength(2)
      expect(errors[0]).toBeInstanceOf(Error)
    })

    test('returns empty array from success response', () => {
      const errors = getErrors(successResponse)
      expect(errors).toEqual([])
    })

    test('filters non-Error values', () => {
      const responseWithNonErrors: NotificationStatus = {
        status: 'error',
        errors: {
          email: new Error('Valid error'),
          // @ts-expect-error - Testing runtime behavior with invalid data
          sms: 'not an error',
        },
      }
      const errors = getErrors(responseWithNonErrors)
      expect(errors).toHaveLength(1)
      expect(errors[0].message).toBe('Valid error')
    })
  })

  describe('getChannelIds helper function', () => {
    test('returns channel IDs from success response', () => {
      const ids = getChannelIds(successResponse)
      expect(ids).toEqual({
        email: 'msg-123',
        sms: 'sms-456',
      })
    })

    test('returns empty object from error response', () => {
      const ids = getChannelIds(errorResponse)
      expect(ids).toEqual({})
    })

    test('handles mixed response with some channels', () => {
      const ids = getChannelIds(mixedResponse)
      expect(ids).toEqual({
        email: 'msg-123',
      })
    })

    test('handles channels with undefined id', () => {
      const responseWithUndefinedId: NotificationStatus = {
        status: 'success',
        channels: {
          email: { id: 'msg-123', providerId: 'sendgrid' },
          sms: { id: undefined, providerId: 'twilio' },
        },
      }
      const ids = getChannelIds(responseWithUndefinedId)
      expect(ids).toEqual({
        email: 'msg-123',
      })
    })
  })

  describe('Type compatibility', () => {
    test('SuccessNotificationStatus is assignable to NotificationStatus', () => {
      const success: SuccessNotificationStatus = {
        status: 'success',
        channels: {
          email: { id: 'msg-123', providerId: 'sendgrid' },
        },
      }

      // This assignment should compile without errors
      const notification: NotificationStatus = success
      expect(notification.status).toBe('success')
    })

    test('ErrorNotificationStatus is assignable to NotificationStatus', () => {
      const error: ErrorNotificationStatus = {
        status: 'error',
        errors: {
          email: new Error('Failed'),
        },
      }

      // This assignment should compile without errors
      const notification: NotificationStatus = error
      expect(notification.status).toBe('error')
    })

    test('type guards work with explicitly typed discriminated unions', () => {
      const createNotification = (success: boolean): NotificationStatus => {
        if (success) {
          return {
            status: 'success',
            channels: { email: { id: 'test', providerId: 'test' } },
          }
        }
        return {
          status: 'error',
          errors: { email: new Error('Failed') },
        }
      }

      const successResult = createNotification(true)
      const errorResult = createNotification(false)

      expect(isSuccessResponse(successResult)).toBe(true)
      expect(isErrorResponse(errorResult)).toBe(true)

      // Verify type narrowing works with dynamically created responses
      if (isSuccessResponse(successResult)) {
        expect(successResult.channels.email?.id).toBe('test')
      }

      if (isErrorResponse(errorResult)) {
        expect(errorResult.errors.email?.message).toBe('Failed')
      }
    })
  })

  describe('Edge cases', () => {
    test('handles response with empty channels object', () => {
      const responseWithEmptyChannels: NotificationStatus = {
        status: 'success',
        channels: {},
      }

      expect(isSuccessResponse(responseWithEmptyChannels)).toBe(true)

      if (isSuccessResponse(responseWithEmptyChannels)) {
        expect(Object.keys(responseWithEmptyChannels.channels)).toHaveLength(0)
      }
    })

    test('handles response with empty errors object', () => {
      const responseWithEmptyErrors: NotificationStatus = {
        status: 'error',
        errors: {},
      }

      expect(isErrorResponse(responseWithEmptyErrors)).toBe(true)

      if (isErrorResponse(responseWithEmptyErrors)) {
        expect(Object.keys(responseWithEmptyErrors.errors)).toHaveLength(0)
      }
    })
  })
})
