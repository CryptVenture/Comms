import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest'
import v4Credentials, { AWSCredentialsError } from '../../../src/util/aws/v4_credentials'
import type { AWSCredentials } from '../../../src/util/aws/v4'

describe('V4Credentials', () => {
  const validCredentials: AWSCredentials = {
    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  }

  beforeEach(() => {
    // Clear cache before each test
    v4Credentials.emptyCache()
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Restore real timers after each test
    vi.useRealTimers()
  })

  describe('createScope', () => {
    test('creates valid credential scope string', () => {
      const scope = v4Credentials.createScope('20240101', 'us-east-1', 'ses')
      expect(scope).toBe('20240101/us-east-1/ses/aws4_request')
    })

    test('truncates date to YYYYMMDD format', () => {
      const scope = v4Credentials.createScope('20240101T120000Z', 'us-west-2', 's3')
      expect(scope).toBe('20240101/us-west-2/s3/aws4_request')
    })

    test('throws error for invalid date', () => {
      expect(() => v4Credentials.createScope('', 'us-east-1', 'ses')).toThrow(AWSCredentialsError)
      expect(() => v4Credentials.createScope('', 'us-east-1', 'ses')).toThrow(
        'Invalid date: must be a non-empty string'
      )
    })

    test('throws error for invalid region', () => {
      expect(() => v4Credentials.createScope('20240101', '', 'ses')).toThrow(AWSCredentialsError)
      expect(() => v4Credentials.createScope('20240101', '', 'ses')).toThrow(
        'Invalid region: must be a non-empty string'
      )
    })

    test('throws error for invalid service name', () => {
      expect(() => v4Credentials.createScope('20240101', 'us-east-1', '')).toThrow(
        AWSCredentialsError
      )
      expect(() => v4Credentials.createScope('20240101', 'us-east-1', '')).toThrow(
        'Invalid service name: must be a non-empty string'
      )
    })
  })

  describe('getSigningKey', () => {
    test('derives signing key successfully', () => {
      const key = v4Credentials.getSigningKey(validCredentials, '20240101', 'us-east-1', 'ses')
      expect(key).toBeInstanceOf(Buffer)
      expect(key.length).toBeGreaterThan(0)
    })

    test('returns same key for same parameters (caching)', () => {
      const key1 = v4Credentials.getSigningKey(validCredentials, '20240101', 'us-east-1', 'ses')
      const key2 = v4Credentials.getSigningKey(validCredentials, '20240101', 'us-east-1', 'ses')
      expect(key1).toBe(key2) // Same Buffer instance
    })

    test('returns different keys for different dates', () => {
      const key1 = v4Credentials.getSigningKey(validCredentials, '20240101', 'us-east-1', 'ses')
      const key2 = v4Credentials.getSigningKey(validCredentials, '20240102', 'us-east-1', 'ses')
      expect(key1).not.toBe(key2)
      expect(Buffer.compare(key1, key2)).not.toBe(0)
    })

    test('returns different keys for different regions', () => {
      const key1 = v4Credentials.getSigningKey(validCredentials, '20240101', 'us-east-1', 'ses')
      const key2 = v4Credentials.getSigningKey(validCredentials, '20240101', 'us-west-2', 'ses')
      expect(key1).not.toBe(key2)
      expect(Buffer.compare(key1, key2)).not.toBe(0)
    })

    test('returns different keys for different services', () => {
      const key1 = v4Credentials.getSigningKey(validCredentials, '20240101', 'us-east-1', 'ses')
      const key2 = v4Credentials.getSigningKey(validCredentials, '20240101', 'us-east-1', 's3')
      expect(key1).not.toBe(key2)
      expect(Buffer.compare(key1, key2)).not.toBe(0)
    })

    test('does not cache when shouldCache is false', () => {
      const key1 = v4Credentials.getSigningKey(
        validCredentials,
        '20240101',
        'us-east-1',
        'ses',
        false
      )
      expect(v4Credentials.getCacheSize()).toBe(0)
      expect(v4Credentials.isCached(validCredentials, '20240101', 'us-east-1', 'ses')).toBe(false)

      const key2 = v4Credentials.getSigningKey(
        validCredentials,
        '20240101',
        'us-east-1',
        'ses',
        false
      )
      expect(key1).not.toBe(key2) // Different Buffer instances (not cached)
      expect(Buffer.compare(key1, key2)).toBe(0) // But same content
    })

    test('throws error for invalid credentials', () => {
      expect(() =>
        v4Credentials.getSigningKey({} as AWSCredentials, '20240101', 'us-east-1', 'ses')
      ).toThrow(AWSCredentialsError)
      expect(() =>
        v4Credentials.getSigningKey({} as AWSCredentials, '20240101', 'us-east-1', 'ses')
      ).toThrow('Invalid credentials: secretAccessKey and accessKeyId are required')
    })

    test('throws error for invalid date', () => {
      expect(() => v4Credentials.getSigningKey(validCredentials, '', 'us-east-1', 'ses')).toThrow(
        AWSCredentialsError
      )
      expect(() => v4Credentials.getSigningKey(validCredentials, '', 'us-east-1', 'ses')).toThrow(
        'Invalid date: must be a non-empty string'
      )
    })

    test('throws error for invalid region', () => {
      expect(() => v4Credentials.getSigningKey(validCredentials, '20240101', '', 'ses')).toThrow(
        AWSCredentialsError
      )
      expect(() => v4Credentials.getSigningKey(validCredentials, '20240101', '', 'ses')).toThrow(
        'Invalid region: must be a non-empty string'
      )
    })

    test('throws error for invalid service', () => {
      expect(() =>
        v4Credentials.getSigningKey(validCredentials, '20240101', 'us-east-1', '')
      ).toThrow(AWSCredentialsError)
      expect(() =>
        v4Credentials.getSigningKey(validCredentials, '20240101', 'us-east-1', '')
      ).toThrow('Invalid service: must be a non-empty string')
    })
  })

  describe('Time-based expiration', () => {
    test('returns cached key within TTL (24 hours)', () => {
      vi.useFakeTimers()
      const now = new Date('2024-01-01T12:00:00Z')
      vi.setSystemTime(now)

      // Get key at 12:00
      const key1 = v4Credentials.getSigningKey(validCredentials, '20240101', 'us-east-1', 'ses')
      expect(v4Credentials.getCacheSize()).toBe(1)

      // Advance time by 23 hours (still within 24-hour TTL)
      vi.advanceTimersByTime(23 * 60 * 60 * 1000)

      // Should return same cached key
      const key2 = v4Credentials.getSigningKey(validCredentials, '20240101', 'us-east-1', 'ses')
      expect(key2).toBe(key1) // Same Buffer instance
      expect(v4Credentials.getCacheSize()).toBe(1)
    })

    test('regenerates key after TTL expiration (24 hours)', () => {
      vi.useFakeTimers()
      const now = new Date('2024-01-01T12:00:00Z')
      vi.setSystemTime(now)

      // Get key at 12:00
      const key1 = v4Credentials.getSigningKey(validCredentials, '20240101', 'us-east-1', 'ses')
      expect(v4Credentials.getCacheSize()).toBe(1)

      // Advance time by 24 hours + 1 millisecond (past TTL)
      vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1)

      // Should regenerate key (expired)
      const key2 = v4Credentials.getSigningKey(validCredentials, '20240101', 'us-east-1', 'ses')
      expect(key2).not.toBe(key1) // Different Buffer instance
      expect(Buffer.compare(key1, key2)).toBe(0) // But same content (same date/region/service)
      expect(v4Credentials.getCacheSize()).toBe(1) // Old entry removed, new entry added
    })

    test('expired key is removed from cache when accessed', () => {
      vi.useFakeTimers()
      const now = new Date('2024-01-01T12:00:00Z')
      vi.setSystemTime(now)

      v4Credentials.getSigningKey(validCredentials, '20240101', 'us-east-1', 'ses')
      expect(v4Credentials.getCacheSize()).toBe(1)
      expect(v4Credentials.isCached(validCredentials, '20240101', 'us-east-1', 'ses')).toBe(true)

      // Advance time past TTL
      vi.advanceTimersByTime(25 * 60 * 60 * 1000)

      // Access the key - should detect expiration and remove old entry
      v4Credentials.getSigningKey(validCredentials, '20240101', 'us-east-1', 'ses')

      // Cache size should still be 1 (old removed, new added)
      expect(v4Credentials.getCacheSize()).toBe(1)
    })
  })

  describe('cleanExpiredEntries', () => {
    test('removes all expired entries', () => {
      vi.useFakeTimers()
      const now = new Date('2024-01-01T12:00:00Z')
      vi.setSystemTime(now)

      // Add 3 entries
      v4Credentials.getSigningKey(validCredentials, '20240101', 'us-east-1', 'ses')
      v4Credentials.getSigningKey(validCredentials, '20240101', 'us-west-2', 'ses')
      v4Credentials.getSigningKey(validCredentials, '20240101', 'eu-west-1', 's3')
      expect(v4Credentials.getCacheSize()).toBe(3)

      // Advance time past TTL
      vi.advanceTimersByTime(25 * 60 * 60 * 1000)

      // Clean expired entries
      const removed = v4Credentials.cleanExpiredEntries()
      expect(removed).toBe(3)
      expect(v4Credentials.getCacheSize()).toBe(0)
    })

    test('removes only expired entries, keeps valid ones', () => {
      vi.useFakeTimers()
      const now = new Date('2024-01-01T12:00:00Z')
      vi.setSystemTime(now)

      // Add 2 entries at T+0
      v4Credentials.getSigningKey(validCredentials, '20240101', 'us-east-1', 'ses')
      v4Credentials.getSigningKey(validCredentials, '20240101', 'us-west-2', 'ses')

      // Advance time by 12 hours
      vi.advanceTimersByTime(12 * 60 * 60 * 1000)

      // Add 1 more entry at T+12h
      v4Credentials.getSigningKey(validCredentials, '20240101', 'eu-west-1', 's3')
      expect(v4Credentials.getCacheSize()).toBe(3)

      // Advance time by 13 more hours (total 25h from start)
      vi.advanceTimersByTime(13 * 60 * 60 * 1000)

      // First 2 entries are expired (25h old), third is still valid (13h old)
      const removed = v4Credentials.cleanExpiredEntries()
      expect(removed).toBe(2)
      expect(v4Credentials.getCacheSize()).toBe(1)

      // Verify the remaining entry is the newest one
      expect(v4Credentials.isCached(validCredentials, '20240101', 'eu-west-1', 's3')).toBe(true)
      expect(v4Credentials.isCached(validCredentials, '20240101', 'us-east-1', 'ses')).toBe(false)
      expect(v4Credentials.isCached(validCredentials, '20240101', 'us-west-2', 'ses')).toBe(false)
    })

    test('returns 0 when no entries are expired', () => {
      vi.useFakeTimers()
      const now = new Date('2024-01-01T12:00:00Z')
      vi.setSystemTime(now)

      v4Credentials.getSigningKey(validCredentials, '20240101', 'us-east-1', 'ses')

      // Advance time by 1 hour (well within TTL)
      vi.advanceTimersByTime(1 * 60 * 60 * 1000)

      const removed = v4Credentials.cleanExpiredEntries()
      expect(removed).toBe(0)
      expect(v4Credentials.getCacheSize()).toBe(1)
    })

    test('returns 0 when cache is empty', () => {
      const removed = v4Credentials.cleanExpiredEntries()
      expect(removed).toBe(0)
      expect(v4Credentials.getCacheSize()).toBe(0)
    })
  })

  describe('emptyCache', () => {
    test('clears all cache entries', () => {
      v4Credentials.getSigningKey(validCredentials, '20240101', 'us-east-1', 'ses')
      v4Credentials.getSigningKey(validCredentials, '20240101', 'us-west-2', 'ses')
      expect(v4Credentials.getCacheSize()).toBe(2)

      v4Credentials.emptyCache()
      expect(v4Credentials.getCacheSize()).toBe(0)
    })

    test('allows fresh caching after emptying', () => {
      const key1 = v4Credentials.getSigningKey(validCredentials, '20240101', 'us-east-1', 'ses')
      v4Credentials.emptyCache()

      const key2 = v4Credentials.getSigningKey(validCredentials, '20240101', 'us-east-1', 'ses')
      expect(key2).not.toBe(key1) // Different Buffer instance (re-derived)
      expect(Buffer.compare(key1, key2)).toBe(0) // Same content
      expect(v4Credentials.getCacheSize()).toBe(1)
    })
  })

  describe('getCacheSize', () => {
    test('returns 0 for empty cache', () => {
      expect(v4Credentials.getCacheSize()).toBe(0)
    })

    test('returns correct size as entries are added', () => {
      expect(v4Credentials.getCacheSize()).toBe(0)

      v4Credentials.getSigningKey(validCredentials, '20240101', 'us-east-1', 'ses')
      expect(v4Credentials.getCacheSize()).toBe(1)

      v4Credentials.getSigningKey(validCredentials, '20240101', 'us-west-2', 'ses')
      expect(v4Credentials.getCacheSize()).toBe(2)

      // Same parameters - should not increase size
      v4Credentials.getSigningKey(validCredentials, '20240101', 'us-east-1', 'ses')
      expect(v4Credentials.getCacheSize()).toBe(2)
    })
  })

  describe('isCached', () => {
    test('returns false for non-cached key', () => {
      expect(v4Credentials.isCached(validCredentials, '20240101', 'us-east-1', 'ses')).toBe(false)
    })

    test('returns true for cached key', () => {
      v4Credentials.getSigningKey(validCredentials, '20240101', 'us-east-1', 'ses')
      expect(v4Credentials.isCached(validCredentials, '20240101', 'us-east-1', 'ses')).toBe(true)
    })

    test('returns false after cache is emptied', () => {
      v4Credentials.getSigningKey(validCredentials, '20240101', 'us-east-1', 'ses')
      v4Credentials.emptyCache()
      expect(v4Credentials.isCached(validCredentials, '20240101', 'us-east-1', 'ses')).toBe(false)
    })

    test('returns false for invalid credentials without throwing', () => {
      expect(v4Credentials.isCached({} as AWSCredentials, '20240101', 'us-east-1', 'ses')).toBe(
        false
      )
    })
  })

  describe('LRU eviction', () => {
    test('evicts oldest entry when cache exceeds 50 entries', () => {
      // Fill cache with 50 entries
      for (let i = 0; i < 50; i++) {
        v4Credentials.getSigningKey(validCredentials, '20240101', `region-${i}`, 'ses')
      }
      expect(v4Credentials.getCacheSize()).toBe(50)

      // Verify first entry exists
      expect(v4Credentials.isCached(validCredentials, '20240101', 'region-0', 'ses')).toBe(true)

      // Add one more - should evict the oldest (region-0)
      v4Credentials.getSigningKey(validCredentials, '20240101', 'region-50', 'ses')
      expect(v4Credentials.getCacheSize()).toBe(50)
      expect(v4Credentials.isCached(validCredentials, '20240101', 'region-0', 'ses')).toBe(false)
      expect(v4Credentials.isCached(validCredentials, '20240101', 'region-50', 'ses')).toBe(true)
    })
  })

  describe('Different credentials', () => {
    test('caches keys separately for different credentials', () => {
      const credentials1: AWSCredentials = {
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      }

      const credentials2: AWSCredentials = {
        accessKeyId: 'AKIDEXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYZZZZZZZZZZ',
      }

      const key1 = v4Credentials.getSigningKey(credentials1, '20240101', 'us-east-1', 'ses')
      const key2 = v4Credentials.getSigningKey(credentials2, '20240101', 'us-east-1', 'ses')

      expect(key1).not.toBe(key2)
      expect(Buffer.compare(key1, key2)).not.toBe(0)
      expect(v4Credentials.getCacheSize()).toBe(2)
    })
  })
})
