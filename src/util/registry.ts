/**
 * Custom error class for Registry-related errors
 */
export class RegistryError extends Error {
  constructor(
    message: string,
    public readonly key?: string,
    public override readonly cause?: unknown
  ) {
    super(message)
    this.name = 'RegistryError'
    Object.setPrototypeOf(this, RegistryError.prototype)
  }
}

/**
 * Registry class for managing singleton instances
 *
 * Provides a thread-safe way to manage singleton instances across the application.
 * This is particularly useful for:
 * - Managing provider instances
 * - Caching expensive objects
 * - Ensuring single instances of services
 *
 * The registry is SSR-safe and works in:
 * - Node.js
 * - Next.js (both server and client)
 * - React Native
 *
 * @example
 * ```typescript
 * import registry from './registry'
 *
 * // Get or create a database connection
 * const db = registry.getInstance('database', () => createDatabaseConnection())
 *
 * // Later calls return the same instance
 * const sameDb = registry.getInstance('database', () => createDatabaseConnection())
 * console.log(db === sameDb) // true
 *
 * // With typed values
 * interface Config { apiKey: string }
 * const config = registry.getInstance<Config>('config', () => ({
 *   apiKey: process.env.API_KEY || ''
 * }))
 * ```
 */
class Registry {
  /**
   * Internal map storing all registered instances
   * Key: unique identifier
   * Value: any type of instance
   */
  private map: Map<string, unknown> = new Map()

  /**
   * Get an instance from the registry, or create it if it doesn't exist
   *
   * This method is idempotent - calling it multiple times with the same key
   * will return the same instance (the factory function is only called once)
   *
   * @template T - The type of the instance to get/create
   * @param key - Unique identifier for the instance
   * @param getValueIfUndefined - Factory function to create the instance if it doesn't exist
   * @returns The instance from the registry
   * @throws {RegistryError} If the key is invalid or the factory function fails
   *
   * @example
   * ```typescript
   * // Simple usage
   * const logger = registry.getInstance('logger', () => createLogger())
   *
   * // With type safety
   * interface Database {
   *   query: (sql: string) => Promise<any>
   * }
   * const db = registry.getInstance<Database>('db', () => ({
   *   query: async (sql) => { ... }
   * }))
   * ```
   */
  getInstance<T>(key: string, getValueIfUndefined: () => T): T {
    // Validate key
    if (!key || typeof key !== 'string') {
      throw new RegistryError('Invalid key: key must be a non-empty string', key)
    }

    // Validate factory function
    if (typeof getValueIfUndefined !== 'function') {
      throw new RegistryError('Invalid factory: getValueIfUndefined must be a function', key)
    }

    // Return existing instance if available
    if (this.map.has(key)) {
      return this.map.get(key) as T
    }

    // Create new instance
    try {
      const value = getValueIfUndefined()
      this.map.set(key, value)
      return value
    } catch (error) {
      throw new RegistryError(`Failed to create instance for key "${key}"`, key, error)
    }
  }

  /**
   * Check if an instance exists in the registry
   *
   * @param key - The key to check
   * @returns true if the instance exists, false otherwise
   *
   * @example
   * ```typescript
   * if (registry.has('database')) {
   *   console.log('Database already initialized')
   * }
   * ```
   */
  has(key: string): boolean {
    return this.map.has(key)
  }

  /**
   * Get an instance from the registry without creating it
   *
   * @template T - The type of the instance
   * @param key - The key to retrieve
   * @returns The instance if it exists, undefined otherwise
   *
   * @example
   * ```typescript
   * const db = registry.get<Database>('database')
   * if (db) {
   *   await db.query('SELECT * FROM users')
   * }
   * ```
   */
  get<T>(key: string): T | undefined {
    return this.map.get(key) as T | undefined
  }

  /**
   * Set or update an instance in the registry
   *
   * @template T - The type of the instance
   * @param key - The key to set
   * @param value - The value to store
   * @throws {RegistryError} If the key is invalid
   *
   * @example
   * ```typescript
   * registry.set('config', { apiKey: 'abc123' })
   * ```
   */
  set<T>(key: string, value: T): void {
    if (!key || typeof key !== 'string') {
      throw new RegistryError('Invalid key: key must be a non-empty string', key)
    }
    this.map.set(key, value)
  }

  /**
   * Remove an instance from the registry
   *
   * @param key - The key to remove
   * @returns true if the instance was removed, false if it didn't exist
   *
   * @example
   * ```typescript
   * registry.delete('database')
   * ```
   */
  delete(key: string): boolean {
    return this.map.delete(key)
  }

  /**
   * Clear all instances from the registry
   * Useful for testing or cleanup
   *
   * @example
   * ```typescript
   * // In tests
   * afterEach(() => {
   *   registry.clear()
   * })
   * ```
   */
  clear(): void {
    this.map.clear()
  }

  /**
   * Get all keys in the registry
   *
   * @returns Array of all registered keys
   *
   * @example
   * ```typescript
   * const keys = registry.keys()
   * console.log('Registered instances:', keys)
   * ```
   */
  keys(): string[] {
    return Array.from(this.map.keys())
  }

  /**
   * Get the number of instances in the registry
   *
   * @returns The number of registered instances
   *
   * @example
   * ```typescript
   * console.log(`Registry contains ${registry.size()} instances`)
   * ```
   */
  size(): number {
    return this.map.size
  }
}

/**
 * Singleton registry instance
 * Import and use this throughout your application for consistent instance management
 */
export default new Registry()
