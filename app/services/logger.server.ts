/**
 * Logger service for Product Builder Pro
 * Provides environment-aware logging with different levels
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV !== 'production';
  private logLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

  private levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.logLevel];
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug') && this.isDevelopment) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (this.shouldLog('error')) {
      const errorContext = {
        ...context,
        ...(error instanceof Error ? {
          errorMessage: error.message,
          errorStack: error.stack,
        } : { error }),
      };
      console.error(this.formatMessage('error', message, errorContext));
    }
  }

  /**
   * Log Shopify API operations
   */
  shopify(operation: string, context?: LogContext): void {
    this.info(`[Shopify] ${operation}`, context);
  }

  /**
   * Log webhook events
   */
  webhook(topic: string, shop: string, context?: LogContext): void {
    this.info(`[Webhook] Received ${topic}`, { shop, ...context });
  }

  /**
   * Log authentication events
   */
  auth(event: string, context?: LogContext): void {
    this.info(`[Auth] ${event}`, context);
  }

  /**
   * Log database operations in development
   */
  db(operation: string, context?: LogContext): void {
    this.debug(`[DB] ${operation}`, context);
  }

  /**
   * Log GraphQL errors specifically
   */
  graphqlError(operation: string, errors: any[], context?: LogContext): void {
    const errorSummary = errors.map(e => ({
      message: e.message,
      code: e.extensions?.code,
      path: e.path,
    }));
    this.error(`[GraphQL] ${operation} failed`, undefined, {
      ...context,
      errors: errorSummary,
    });
  }

  /**
   * Log retry attempts
   */
  retryAttempt(operation: string, attempt: number, delay: number, context?: LogContext): void {
    this.warn(`[Retry] ${operation} - Attempt ${attempt}`, {
      ...context,
      attempt,
      delay,
      nextRetryIn: `${delay}ms`,
    });
  }

  /**
   * Log successful recovery after retries
   */
  errorRecovered(operation: string, attempts: number, context?: LogContext): void {
    this.info(`[Recovery] ${operation} succeeded after ${attempts} attempts`, {
      ...context,
      attempts,
      recovered: true,
    });
  }

  /**
   * Log rate limiting events
   */
  rateLimit(operation: string, retryAfter?: number, context?: LogContext): void {
    this.warn(`[RateLimit] ${operation} throttled`, {
      ...context,
      retryAfter: retryAfter ? `${retryAfter}s` : 'unknown',
    });
  }

  /**
   * Generate a unique request ID for error correlation
   */
  static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Create singleton logger instance
export const logger = new Logger();

// Export the Logger class for static method access
export { Logger };