// src/utils/telemetry/logger.ts
import { trace, SpanStatusCode } from '@opentelemetry/api';

/**
 * Structured logger that logs to both console and Application Insights
 */
export class Logger {
  private context: Record<string, any>;

  constructor(context: Record<string, any> = {}) {
    this.context = context;
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: Record<string, any>): Logger {
    return new Logger({ ...this.context, ...additionalContext });
  }

  /**
   * Log info message
   */
  info(message: string, data?: Record<string, any>): void {
    const logData = { ...this.context, ...data };
    console.log(`[INFO] ${message}`, logData);
    
    const span = trace.getActiveSpan();
    if (span) {
      span.addEvent(message, logData);
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, data?: Record<string, any>): void {
    const logData = { ...this.context, ...data };
    console.warn(`[WARN] ${message}`, logData);
    
    const span = trace.getActiveSpan();
    if (span) {
      span.addEvent(message, { level: 'warning', ...logData });
    }
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | any, data?: Record<string, any>): void {
    const logData = { ...this.context, ...data };
    
    // Log to console
    if (error instanceof Error) {
      console.error(`[ERROR] ${message}`, {
        error: error.message,
        stack: error.stack,
        ...logData
      });
    } else {
      console.error(`[ERROR] ${message}`, { error, ...logData });
    }
    
    // Log to Application Insights via active span
    const span = trace.getActiveSpan();
    if (span) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : message
      });
      
      if (error instanceof Error) {
        span.recordException(error);
      }
      
      span.addEvent(message, { level: 'error', ...logData });
    }
  }

  /**
   * Log debug message (only in development)
   */
  debug(message: string, data?: Record<string, any>): void {
    if (process.env.NODE_ENV === 'development') {
      const logData = { ...this.context, ...data };
      console.debug(`[DEBUG] ${message}`, logData);
    }
  }
}

/**
 * Create a logger instance
 */
export function createLogger(context?: Record<string, any>): Logger {
  return new Logger(context);
}
