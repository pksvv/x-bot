import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { AuthRequest } from '../types';

// Request logging middleware
export const requestLogger = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  const { method, originalUrl, ip, headers } = req;
  const userAgent = headers['user-agent'] || 'Unknown';

  // Log incoming request
  logger.http('Incoming request', {
    method,
    url: originalUrl,
    ip,
    userAgent,
    userId: req.user?.id,
    category: 'request'
  });

  // Override res.end to capture response details
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const responseTime = Date.now() - startTime;
    const { statusCode } = res;

    // Log response
    logger.logAPI(
      method,
      originalUrl,
      req.user?.id,
      statusCode,
      responseTime,
      {
        ip,
        userAgent,
        contentLength: res.get('content-length'),
        category: 'response'
      }
    );

    // Log slow requests
    if (responseTime > 5000) {
      logger.logPerformance('Slow request', responseTime, {
        method,
        url: originalUrl,
        statusCode,
        userId: req.user?.id
      });
    }

    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Error logging middleware
export const errorLogger = (error: Error, req: AuthRequest, res: Response, next: NextFunction): void => {
  const { method, originalUrl, ip, headers } = req;
  const userAgent = headers['user-agent'] || 'Unknown';

  logger.logError(error, 'Request error', {
    method,
    url: originalUrl,
    ip,
    userAgent,
    userId: req.user?.id,
    body: req.body,
    params: req.params,
    query: req.query,
    category: 'request_error'
  });

  next(error);
};

// Security event logging middleware
export const securityLogger = {
  logFailedAuth: (req: Request, reason: string): void => {
    logger.logSecurity('Authentication failed', undefined, req.ip, {
      reason,
      url: req.originalUrl,
      userAgent: req.headers['user-agent'],
      body: req.body?.username ? { username: req.body.username } : undefined
    });
  },

  logSuspiciousActivity: (req: AuthRequest, activity: string, meta?: any): void => {
    logger.logSecurity('Suspicious activity', req.user?.id, req.ip, {
      activity,
      url: req.originalUrl,
      userAgent: req.headers['user-agent'],
      ...meta
    });
  },

  logRateLimitExceeded: (req: Request): void => {
    logger.logSecurity('Rate limit exceeded', undefined, req.ip, {
      url: req.originalUrl,
      userAgent: req.headers['user-agent']
    });
  },

  logPrivilegeEscalation: (req: AuthRequest, attemptedAction: string): void => {
    logger.logSecurity('Privilege escalation attempt', req.user?.id, req.ip, {
      attemptedAction,
      userRole: req.user?.role,
      url: req.originalUrl
    });
  }
};

// Business logic logging middleware
export const businessLogger = {
  logThreadCreation: (threadId: string, userId: string, content: string[]): void => {
    logger.logThreadAction('created', threadId, userId, {
      contentLength: content.length,
      totalCharacters: content.join('').length
    });
  },

  logThreadPublication: (threadId: string, userId: string, tweetIds: string[]): void => {
    logger.logThreadAction('published', threadId, userId, {
      tweetCount: tweetIds.length,
      tweetIds
    });
  },

  logThreadScheduled: (threadId: string, userId: string, scheduledTime: Date): void => {
    logger.logThreadAction('scheduled', threadId, userId, {
      scheduledTime: scheduledTime.toISOString(),
      scheduledIn: scheduledTime.getTime() - Date.now()
    });
  },

  logMetricsCollection: (threadId: string, metrics: any): void => {
    logger.logMetricsCollection(threadId, 1, {
      views: metrics.views,
      likes: metrics.likes,
      retweets: metrics.retweets,
      replies: metrics.replies,
      engagementRate: metrics.engagementRate
    });
  },

  logSheetsSync: (operation: string, threadsCount: number, success: boolean): void => {
    logger.logSheets(`${operation} ${success ? 'successful' : 'failed'}`, {
      operation,
      threadsCount,
      success
    });
  }
};

// Performance monitoring middleware
export const performanceLogger = (threshold: number = 1000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      if (duration > threshold) {
        logger.logPerformance('Slow endpoint', duration, {
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          threshold
        });
      }
    });

    next();
  };
};

// Health check logging
export const healthLogger = {
  logDatabaseHealth: (isHealthy: boolean, responseTime?: number): void => {
    logger.logSystemHealth('database', isHealthy ? 'healthy' : 'unhealthy', {
      responseTime
    });
  },

  logTwitterAPIHealth: (isHealthy: boolean, error?: string): void => {
    logger.logSystemHealth('twitter_api', isHealthy ? 'healthy' : 'unhealthy', {
      error
    });
  },

  logSheetsAPIHealth: (isHealthy: boolean, error?: string): void => {
    logger.logSystemHealth('sheets_api', isHealthy ? 'healthy' : 'unhealthy', {
      error
    });
  },

  logSchedulerHealth: (isHealthy: boolean, error?: string): void => {
    logger.logSystemHealth('scheduler', isHealthy ? 'healthy' : 'unhealthy', {
      error
    });
  }
};

// Sanitize sensitive data from logs
export const sanitizeLogData = (data: any): any => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveFields = [
    'password',
    'passwordHash',
    'token',
    'apiKey',
    'secret',
    'privateKey',
    'authorization',
    'cookie',
    'x-api-key'
  ];

  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  // Recursively sanitize nested objects
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeLogData(sanitized[key]);
    }
  }

  return sanitized;
};