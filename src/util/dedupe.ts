/**
 * Custom error class for dedupe-related errors
 */
export class DedupeError extends Error {
  constructor(
    message: string,
    public override readonly cause?: unknown
  ) {
    super(message)
    this.name = 'DedupeError'
    Object.setPrototypeOf(this, DedupeError.prototype)
  }
}

/**
 * Remove duplicate values from an array while preserving order
 *
 * This function:
 * - Preserves the first occurrence of each value
 * - Maintains the original order
 * - Works with primitives and objects (using reference equality)
 * - Is SSR-safe and works in Node.js, Next.js, and React Native
 *
 * For complex objects, consider using a custom comparator or
 * converting to a Set with a key function
 *
 * @template T - The type of array elements
 * @param array - The array to deduplicate
 * @returns A new array with duplicates removed
 * @throws {DedupeError} If the input is not an array
 *
 * @example
 * ```typescript
 * import dedupe from './dedupe'
 *
 * // With primitives
 * const numbers = dedupe([1, 2, 2, 3, 1, 4])
 * // Result: [1, 2, 3, 4]
 *
 * const strings = dedupe(['a', 'b', 'a', 'c'])
 * // Result: ['a', 'b', 'c']
 *
 * // With objects (reference equality)
 * const obj1 = { id: 1 }
 * const obj2 = { id: 2 }
 * const objs = dedupe([obj1, obj2, obj1])
 * // Result: [obj1, obj2]
 *
 * // Note: Different objects with same content are not deduplicated
 * const notDeduped = dedupe([{ id: 1 }, { id: 1 }])
 * // Result: [{ id: 1 }, { id: 1 }] (two different objects)
 * ```
 */
export default function dedupe<T>(array: T[]): T[] {
  // Validate input
  if (!Array.isArray(array)) {
    throw new DedupeError(`Invalid input: expected array, got ${typeof array}`)
  }

  // Handle empty arrays efficiently
  if (array.length === 0) {
    return []
  }

  // Use filter with indexOf to preserve first occurrence and maintain order
  // This is more performant than Set for small arrays and maintains the original algorithm
  return array.filter((element, position) => array.indexOf(element) === position)
}

/**
 * Remove duplicates from an array using a key function
 *
 * This is useful when you want to deduplicate objects based on a specific property
 * or computed value rather than reference equality
 *
 * @template T - The type of array elements
 * @template K - The type of the key (must be primitive for reliable equality)
 * @param array - The array to deduplicate
 * @param keyFn - Function to extract the key from each element
 * @returns A new array with duplicates removed based on the key
 * @throws {DedupeError} If the input is not an array or keyFn is not a function
 *
 * @example
 * ```typescript
 * import { dedupeBy } from './dedupe'
 *
 * const users = [
 *   { id: 1, name: 'Alice' },
 *   { id: 2, name: 'Bob' },
 *   { id: 1, name: 'Alice Updated' }
 * ]
 *
 * const uniqueUsers = dedupeBy(users, user => user.id)
 * // Result: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]
 *
 * // With strings
 * const items = dedupeBy(
 *   ['apple', 'APPLE', 'banana'],
 *   item => item.toLowerCase()
 * )
 * // Result: ['apple', 'banana']
 * ```
 */
export function dedupeBy<T, K extends string | number | boolean>(
  array: T[],
  keyFn: (item: T) => K
): T[] {
  // Validate inputs
  if (!Array.isArray(array)) {
    throw new DedupeError(`Invalid input: expected array, got ${typeof array}`)
  }

  if (typeof keyFn !== 'function') {
    throw new DedupeError(`Invalid keyFn: expected function, got ${typeof keyFn}`)
  }

  // Handle empty arrays efficiently
  if (array.length === 0) {
    return []
  }

  // Use a Set to track seen keys for O(n) performance
  const seen = new Set<K>()
  const result: T[] = []

  for (const item of array) {
    try {
      const key = keyFn(item)
      if (!seen.has(key)) {
        seen.add(key)
        result.push(item)
      }
    } catch (error) {
      throw new DedupeError('Error executing key function', error)
    }
  }

  return result
}

/**
 * Remove duplicates from an array using a Set (faster for large arrays)
 *
 * This is more performant for large arrays but only works with primitive values
 * (strings, numbers, booleans) or objects where reference equality is sufficient
 *
 * @template T - The type of array elements (should be primitive or use reference equality)
 * @param array - The array to deduplicate
 * @returns A new array with duplicates removed
 * @throws {DedupeError} If the input is not an array
 *
 * @example
 * ```typescript
 * import { dedupeSet } from './dedupe'
 *
 * const numbers = dedupeSet([1, 2, 2, 3, 1, 4])
 * // Result: [1, 2, 3, 4]
 *
 * const strings = dedupeSet(['a', 'b', 'a', 'c'])
 * // Result: ['a', 'b', 'c']
 * ```
 */
export function dedupeSet<T>(array: T[]): T[] {
  // Validate input
  if (!Array.isArray(array)) {
    throw new DedupeError(`Invalid input: expected array, got ${typeof array}`)
  }

  // Use Set for efficient deduplication
  // Note: This doesn't preserve the original order in older JS engines,
  // but modern engines (ES2015+) maintain insertion order
  return Array.from(new Set(array))
}
