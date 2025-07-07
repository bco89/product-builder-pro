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
}

// Create singleton logger instance
export const logger = new Logger();