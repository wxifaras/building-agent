// src/utils/telemetry/logger.ts
import { trace, SpanStatusCode } from '@opentelemetry/api';
import pino, { Logger as PinoLogger } from 'pino';

// Configure Pino logger
const pinoLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
    }
  } : undefined,
  formatters: {
    level: (label) => ({ level: label }),
  },
});

/**
 * Structured logger that logs to console (via Pino) and Application Insights (via OpenTelemetry)
 */
export class Logger {
  private context: Record<string, any>;
  private pinoChild: PinoLogger;

  constructor(context: Record<string, any> = {}) {
    this.context = context;
    this.pinoChild = pinoLogger.child(context);
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
    this.pinoChild.info(data ?? {}, message);
    
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
    this.pinoChild.warn(data ?? {}, message);
    
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
    
    // Log to Pino
    if (error instanceof Error) {
      this.pinoChild.error({ err: error, ...(data ?? {}) }, message);
    } else {
      this.pinoChild.error({ error, ...(data ?? {}) }, message);
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
   * Log debug message
   */
  debug(message: string, data?: Record<string, any>): void {
    this.pinoChild.debug(data ?? {}, message);
  }
}

// Root singleton logger. Node/TS module caching ensures this is instantiated once.
const rootLogger = new Logger();

/**
 * Create (or reuse) a logger instance.
 *
 * - Without context: returns the shared singleton logger.
 * - With context: returns a child logger derived from the singleton.
 */
export function createLogger(context?: Record<string, any>): Logger {
  if (!context || Object.keys(context).length === 0) {
    return rootLogger;
  }
  return rootLogger.child(context);
}

// Optional named export for direct singleton usage.
export const logger = rootLogger;
