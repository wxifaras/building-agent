// src/utils/telemetry/telemetryMiddleware.ts
import { Request, Response, NextFunction } from 'express';
import { trace } from '@opentelemetry/api';
import { AuthRequest } from '../auth/AuthMiddleware';
import { createLogger } from './logger';

/**
 * Middleware to enrich OpenTelemetry spans with request context
 * ExpressInstrumentation already creates spans automatically,
 * this middleware adds additional attributes and logger to the request
 */
export function telemetryMiddleware(req: Request, res: Response, next: NextFunction): void {
  const span = trace.getActiveSpan();
  
  if (span) {
    // Add basic HTTP attributes
    span.setAttribute('http.method', req.method);
    span.setAttribute('http.route', req.route?.path || req.path);
    span.setAttribute('http.url', req.url);
    
    // Add user context if available (after auth middleware)
    const authReq = req as AuthRequest;
    if (authReq.user) {
      span.setAttribute('user.id', authReq.user.userId);
      span.setAttribute('user.email', authReq.user.email || 'unknown');
    }
    
    // Add project context if available (after project access middleware)
    if (authReq.projectId) {
      span.setAttribute('project.id', authReq.projectId);
    }
    
    if (req.params.client_name) {
      span.setAttribute('project.client_name', req.params.client_name);
    }
    
    if (req.params.slug) {
      span.setAttribute('project.slug', req.params.slug);
    }
    
    // Create logger with request context and attach to request
    const logger = createLogger({
      method: req.method,
      path: req.path,
      userId: authReq.user?.userId,
      projectId: authReq.projectId,
    });
    
    // Attach logger to request for route handlers to use
    (req as any).logger = logger;
    
    // Track response status on finish
    res.on('finish', () => {
      span.setAttribute('http.status_code', res.statusCode);
      
      // Log slow requests
      const duration = Date.now() - (req as any).startTime;
      if (duration > 1000) {
        logger.warn('Slow request detected', {
          duration,
          statusCode: res.statusCode
        });
      }
    });
  }
  
  // Track request start time
  (req as any).startTime = Date.now();
  
  next();
}

/**
 * Type augmentation for Express Request to include logger
 */
declare global {
  namespace Express {
    interface Request {
      logger: ReturnType<typeof createLogger>;
      startTime: number;
    }
  }
}
