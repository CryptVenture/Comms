import winston from 'winston'

/**
 * Log level types supported by the logger
 */
export type LevelType = 'error' | 'warn' | 'info' | 'debug' | 'verbose' | 'silly'

/**
 * Winston logger configuration options
 */
export interface LoggerOptions {
  transports?: winston.transport[]
  level?: LevelType
  format?: winston.Logform.Format
  silent?: boolean
  exitOnError?: boolean
}

/**
 * Custom error class for logger-related errors
 */
export class LoggerError extends Error {
  constructor(
    message: string,
    public override readonly cause?: unknown
  ) {
    super(message)
    this.name = 'LoggerError'
    Object.setPrototypeOf(this, LoggerError.prototype)
  }
}

/**
 * Logger class providing a wrapper around Winston logger
 *
 * @example
 * ```typescript
 * import logger from './logger'
 *
 * logger.info('Application started')
 * logger.error('Something went wrong', { error: new Error('test') })
 * logger.warn('This is a warning')
 * ```
 */
class Logger {
  private innerLogger: winston.Logger

  /**
   * Creates a new Logger instance with default console transport
   */
  constructor() {
    try {
      this.innerLogger = winston.createLogger()
      this.configure({
        transports: [
          new winston.transports.Console({
            format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
          }),
        ],
      })
    } catch (error) {
      throw new LoggerError('Failed to initialize logger', error)
    }
  }

  /**
   * Configure the logger with custom options
   *
   * @param options - Winston logger configuration options
   * @throws {LoggerError} If configuration fails
   *
   * @example
   * ```typescript
   * logger.configure({
   *   transports: [new winston.transports.File({ filename: 'app.log' })],
   *   level: 'debug'
   * })
   * ```
   */
  configure(options: LoggerOptions): void {
    try {
      this.innerLogger.configure(options)
    } catch (error) {
      throw new LoggerError('Failed to configure logger', error)
    }
  }

  /**
   * Mute the logger by removing all transports
   * Useful for testing or when you want to temporarily disable logging
   *
   * @example
   * ```typescript
   * logger.mute()
   * logger.info('This will not be logged') // Silent
   * ```
   */
  mute(): void {
    this.configure({ transports: [] })
  }

  /**
   * Log a message at a specific level
   *
   * @param level - The log level
   * @param info - The message or object to log
   * @param extra - Optional additional metadata
   *
   * @example
   * ```typescript
   * logger.log('info', 'User logged in', { userId: 123 })
   * ```
   */
  log(level: LevelType, info: unknown, extra?: unknown): void {
    try {
      this.innerLogger.log(level, info as string, extra)
    } catch (error) {
      // Fallback to console if winston fails
      console.error('Logger failed:', error)
      console.log(level, info, extra)
    }
  }

  /**
   * Log an error message
   *
   * @param info - The error message or object
   * @param extra - Optional additional metadata
   *
   * @example
   * ```typescript
   * logger.error('Database connection failed', { error: dbError })
   * ```
   */
  error(info: unknown, extra?: unknown): void {
    this.log('error', info, extra)
  }

  /**
   * Log a warning message
   *
   * @param info - The warning message or object
   * @param extra - Optional additional metadata
   *
   * @example
   * ```typescript
   * logger.warn('API rate limit approaching', { remaining: 10 })
   * ```
   */
  warn(info: unknown, extra?: unknown): void {
    this.log('warn', info, extra)
  }

  /**
   * Log an informational message
   *
   * @param info - The info message or object
   * @param extra - Optional additional metadata
   *
   * @example
   * ```typescript
   * logger.info('Server started', { port: 3000 })
   * ```
   */
  info(info: unknown, extra?: unknown): void {
    this.log('info', info, extra)
  }

  /**
   * Log a debug message
   *
   * @param info - The debug message or object
   * @param extra - Optional additional metadata
   *
   * @example
   * ```typescript
   * logger.debug('Request details', { method: 'POST', url: '/api/users' })
   * ```
   */
  debug(info: unknown, extra?: unknown): void {
    this.log('debug', info, extra)
  }

  /**
   * Log a verbose message
   *
   * @param info - The verbose message or object
   * @param extra - Optional additional metadata
   */
  verbose(info: unknown, extra?: unknown): void {
    this.log('verbose', info, extra)
  }

  /**
   * Get the underlying Winston logger instance
   * Useful for advanced configurations or integrations
   *
   * @returns The Winston logger instance
   */
  getInnerLogger(): winston.Logger {
    return this.innerLogger
  }
}

/**
 * Singleton logger instance
 * Import and use this throughout your application for consistent logging
 */
export default new Logger()
