import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { monitoring } from '../utils/metrics';
import { alertService } from '../services/AlertService';
import { AuthRequest } from '../types';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  errorCode?: string;
  details?: any;
}

export class CustomError extends Error implements AppError {
  public statusCode: number;
  public isOperational: boolean;
  public errorCode: string;
  public details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error types
export class ValidationError extends CustomError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', true, details);
  }
}

export class AuthenticationError extends CustomError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR', true);
  }
}

export class AuthorizationError extends CustomError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR', true);
  }
}

export class NotFoundError extends CustomError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND_ERROR', true);
  }
}

export class RateLimitError extends CustomError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_ERROR', true);
  }
}

export class ExternalServiceError extends CustomError {
  constructor(service: string, message: string, details?: any) {
    super(`${service} error: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR', true, details);
  }
}

export class DatabaseError extends CustomError {
  constructor(message: string, details?: any) {
    super(`Database error: ${message}`, 500, 'DATABASE_ERROR', true, details);
  }
}

// Error classification
const classifyError = (error: Error): { severity: 'low' | 'medium' | 'high' | 'critical', category: string } => {
  if (error instanceof ValidationError || error instanceof NotFoundError) {
    return { severity: 'low', category: 'client_error' };
  }
  
  if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
    return { severity: 'medium', category: 'security' };
  }
  
  if (error instanceof RateLimitError) {
    return { severity: 'medium', category: 'rate_limiting' };
  }
  
  if (error instanceof ExternalServiceError) {
    return { severity: 'high', category: 'external_service' };
  }
  
  if (error instanceof DatabaseError) {
    return { severity: 'critical', category: 'database' };
  }

  // Default for unknown errors
  return { severity: 'high', category: 'application' };
};

// Main error handling middleware
export const errorHandler = (
  error: AppError,
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const correlationId = req.correlationId;
  const requestLogger = correlationId ? logger.withCorrelationId(correlationId) : logger;
  
  // Set default values
  const statusCode = error.statusCode || 500;
  const errorCode = error.errorCode || 'INTERNAL_ERROR';
  const isOperational = error.isOperational !== undefined ? error.isOperational : false;
  
  // Classify error
  const { severity, category } = classifyError(error);
  
  // Create error context
  const errorContext = {
    errorId: correlationId || `error_${Date.now()}`,
    errorCode,
    statusCode,
    isOperational,
    severity,
    category,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: req.user?.id,
    timestamp: new Date().toISOString(),
    stack: error.stack,
    details: error.details
  };

  // Log error with appropriate level
  if (statusCode >= 500) {
    requestLogger.logError(error, 'Server error', errorContext);
  } else if (statusCode >= 400) {
    requestLogger.warn('Client error', {
      message: error.message,
      ...errorContext,
      stack: undefined // Don't log stack for client errors
    });
  }

  // Track error metrics
  monitoring.trackError(category, req.originalUrl, severity);
  monitoring.incrementErrorCount(errorCode);

  // Trigger alerts for critical errors
  if (severity === 'critical' || (severity === 'high' && statusCode >= 500)) {
    alertService.triggerAlert({
      id: `error_${Date.now()}`,
      type: 'custom',
      level: severity === 'critical' ? 'critical' : 'high',
      title: `${category.toUpperCase()} Error`,
      message: `${error.message} (${errorCode})`,
      timestamp: new Date().toISOString(),
      source: 'error_handler',
      metadata: errorContext
    }).catch(alertError => {
      logger.logError(alertError as Error, 'Failed to trigger error alert');
    });
  }

  // Prepare response
  const response: any = {
    success: false,
    error: {
      code: errorCode,
      message: error.message,
      timestamp: new Date().toISOString()
    }
  };

  // Add correlation ID to response
  if (correlationId) {
    response.correlationId = correlationId;
  }

  // Add details in development mode
  if (process.env.NODE_ENV === 'development') {
    response.error.details = error.details;
    response.error.stack = error.stack;
  }

  // Send response
  res.status(statusCode).json(response);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new NotFoundError('Endpoint');
  next(error);
};

// Uncaught exception handler
export const setupGlobalErrorHandlers = (): void => {
  process.on('uncaughtException', (error: Error) => {
    logger.logError(error, 'Uncaught Exception', {
      severity: 'critical',
      category: 'system',
      timestamp: new Date().toISOString()
    });

    // Trigger critical alert
    alertService.triggerAlert({
      id: `uncaught_${Date.now()}`,
      type: 'custom',
      level: 'critical',
      title: 'Uncaught Exception',
      message: error.message,
      timestamp: new Date().toISOString(),
      source: 'process',
      metadata: {
        stack: error.stack,
        name: error.name
      }
    }).catch(() => {
      // Fallback logging if alert service fails
      console.error('CRITICAL: Failed to send alert for uncaught exception');
    });

    // Give time for logging/alerts then exit
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    
    logger.logError(error, 'Unhandled Promise Rejection', {
      severity: 'high',
      category: 'promise',
      timestamp: new Date().toISOString(),
      promise: promise.toString()
    });

    // Trigger alert
    alertService.triggerAlert({
      id: `rejection_${Date.now()}`,
      type: 'custom',
      level: 'high',
      title: 'Unhandled Promise Rejection',
      message: error.message,
      timestamp: new Date().toISOString(),
      source: 'process',
      metadata: {
        stack: error.stack,
        reason: String(reason)
      }
    }).catch(() => {
      console.error('WARNING: Failed to send alert for unhandled rejection');
    });
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
  });
};

// Express error types checking
export const isAppError = (error: any): error is AppError => {
  return error instanceof Error && 'statusCode' in error;
};

// Error factory functions
export const createValidationError = (field: string, value: any, rule: string): ValidationError => {
  return new ValidationError(`Validation failed for field '${field}'`, {
    field,
    value,
    rule
  });
};

export const createDatabaseError = (operation: string, table: string, originalError: Error): DatabaseError => {
  return new DatabaseError(`${operation} failed on ${table}`, {
    operation,
    table,
    originalError: originalError.message
  });
};

export const createExternalServiceError = (service: string, endpoint: string, statusCode: number, message: string): ExternalServiceError => {
  return new ExternalServiceError(service, message, {
    endpoint,
    statusCode,
    timestamp: new Date().toISOString()
  });
};