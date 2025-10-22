/**
 * Structured logging utility for consistent logging across the application
 * Provides better debugging and monitoring capabilities
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
    name?: string;
  };
}

/**
 * Base logger class
 */
class Logger {
  private context: Record<string, any>;

  constructor(defaultContext: Record<string, any> = {}) {
    this.context = defaultContext;
  }

  /**
   * Creates a child logger with additional context
   */
  child(additionalContext: Record<string, any>): Logger {
    return new Logger({ ...this.context, ...additionalContext });
  }

  /**
   * Formats a log entry
   */
  private formatLog(level: LogLevel, message: string, context?: Record<string, any>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.context, ...context },
    };
  }

  /**
   * Outputs a log entry
   */
  private output(logEntry: LogEntry): void {
    const { level, ...rest } = logEntry;

    // In production, you would send this to a logging service
    // e.g., DataDog, CloudWatch, LogRocket, etc.
    if (process.env.NODE_ENV === 'production') {
      // For now, just use JSON.stringify for structured logs
      const logString = JSON.stringify(rest);

      switch (level) {
        case 'debug':
          console.debug(logString);
          break;
        case 'info':
          console.info(logString);
          break;
        case 'warn':
          console.warn(logString);
          break;
        case 'error':
          console.error(logString);
          break;
      }
    } else {
      // Development: pretty print
      const prefix = `[${level.toUpperCase()}]`;
      const contextStr =
        Object.keys(rest.context || {}).length > 0
          ? `\n  Context: ${JSON.stringify(rest.context, null, 2)}`
          : '';
      const errorStr = rest.error
        ? `\n  Error: ${rest.error.message}\n  Stack: ${rest.error.stack}`
        : '';

      const logMessage = `${prefix} ${rest.message}${contextStr}${errorStr}`;

      switch (level) {
        case 'debug':
          console.debug(logMessage);
          break;
        case 'info':
          console.info(logMessage);
          break;
        case 'warn':
          console.warn(logMessage);
          break;
        case 'error':
          console.error(logMessage);
          break;
      }
    }
  }

  /**
   * Debug level logging
   */
  debug(message: string, context?: Record<string, any>): void {
    if (process.env.NODE_ENV === 'development') {
      this.output(this.formatLog('debug', message, context));
    }
  }

  /**
   * Info level logging
   */
  info(message: string, context?: Record<string, any>): void {
    this.output(this.formatLog('info', message, context));
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: Record<string, any>): void {
    this.output(this.formatLog('warn', message, context));
  }

  /**
   * Error level logging
   */
  error(message: string, error?: Error | unknown, context?: Record<string, any>): void {
    const logEntry = this.formatLog('error', message, context);

    if (error instanceof Error) {
      logEntry.error = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      };
    } else if (error) {
      logEntry.error = {
        message: String(error),
      };
    }

    this.output(logEntry);
  }
}

/**
 * Default application logger
 */
export const logger = new Logger({
  app: 'whispers-and-flames',
  env: process.env.NODE_ENV || 'development',
});

/**
 * Create a logger for a specific module/component
 */
export function createLogger(module: string): Logger {
  return logger.child({ module });
}

/**
 * API request logger
 */
export function logApiRequest(
  method: string,
  path: string,
  statusCode: number,
  duration?: number,
  userId?: string
): void {
  logger.info('API Request', {
    method,
    path,
    statusCode,
    duration,
    userId,
  });
}

/**
 * Security event logger
 */
export function logSecurityEvent(
  event: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  details?: Record<string, any>
): void {
  logger.warn('Security Event', {
    event,
    severity,
    ...details,
  });
}

/**
 * Performance metric logger
 */
export function logPerformance(
  metric: string,
  value: number,
  unit: string = 'ms',
  context?: Record<string, any>
): void {
  logger.info('Performance Metric', {
    metric,
    value,
    unit,
    ...context,
  });
}
