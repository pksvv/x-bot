import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { AuthRequest } from '../types';

// Simple error interface
export interface AppError extends Error {
  statusCode?: number;
  errorCode?: string;
}

// Basic error classes for common cases
export class ValidationError extends Error {
  statusCode = 400;
  errorCode = 'VALIDATION_ERROR';
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  errorCode = 'NOT_FOUND';
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class AuthenticationError extends Error {
  statusCode = 401;
  errorCode = 'AUTH_ERROR';
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

// Simple centralized error handler
export const errorHandler = (
  error: AppError,
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = error.statusCode || 500;
  const errorCode = error.errorCode || 'INTERNAL_ERROR';
  
  // Log error with correlation ID if available
  const logData = {
    errorCode,
    statusCode,
    url: req.originalUrl,
    method: req.method,
    correlationId: req.correlationId,
    userId: req.user?.id,
    message: error.message
  };

  if (statusCode >= 500) {
    logger.logError(error, 'Server error', logData);
  } else {
    logger.warn('Client error', logData);
  }

  // Send response
  const response: any = {
    success: false,
    error: {
      code: errorCode,
      message: error.message,
      timestamp: new Date().toISOString()
    }
  };

  if (req.correlationId) {
    response.correlationId = req.correlationId;
  }

  res.status(statusCode).json(response);
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new NotFoundError('Endpoint not found');
  next(error);
};

// Async wrapper for route handlers
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};