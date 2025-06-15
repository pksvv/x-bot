import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// Log levels with numeric priorities
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Log colors for console output
const LOG_COLORS = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
};

// Add colors to winston
winston.addColors(LOG_COLORS);

class Logger {
  private logger: winston.Logger;
  private logDir: string;

  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.logger = this.createLogger();
  }

  private createLogger(): winston.Logger {
    const environment = process.env.NODE_ENV || 'development';
    const isDevelopment = environment === 'development';
    const isTest = environment === 'test';
    const isProduction = environment === 'production';

    // Base format for all transports
    const baseFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.errors({ stack: true }),
      winston.format.json()
    );

    // Console format with colors for development
    const consoleFormat = winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.errors({ stack: true }),
      winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}${info.stack ? '\n' + info.stack : ''}`
      )
    );

    const transports: winston.transport[] = [];

    // Console transport (always enabled except in test)
    if (!isTest) {
      transports.push(
        new winston.transports.Console({
          level: isDevelopment ? 'debug' : 'info',
          format: isDevelopment ? consoleFormat : baseFormat
        })
      );
    }

    // File transports (disabled in test and production for GCP free tier)
    if (!isTest && !isProduction) {
      // Error log file (errors only)
      transports.push(
        new DailyRotateFile({
          filename: path.join(this.logDir, 'error-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          format: baseFormat,
          maxSize: '10m',
          maxFiles: '3d',
          zippedArchive: true
        })
      );

      // Combined log file (all levels) - smaller for development
      transports.push(
        new DailyRotateFile({
          filename: path.join(this.logDir, 'combined-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          format: baseFormat,
          maxSize: '10m',
          maxFiles: '7d',
          zippedArchive: true
        })
      );
    }

    return winston.createLogger({
      level: isDevelopment ? 'debug' : 'info',
      levels: LOG_LEVELS,
      format: baseFormat,
      transports,
      // Handle uncaught exceptions and rejections (console only in production)
      exceptionHandlers: !isTest && !isProduction ? [
        new DailyRotateFile({
          filename: path.join(this.logDir, 'exceptions-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: '10m',
          maxFiles: '3d'
        })
      ] : !isTest ? [
        new winston.transports.Console()
      ] : [],
      rejectionHandlers: !isTest && !isProduction ? [
        new DailyRotateFile({
          filename: path.join(this.logDir, 'rejections-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: '10m',
          maxFiles: '3d'
        })
      ] : !isTest ? [
        new winston.transports.Console()
      ] : []
    });
  }

  // Core logging methods
  error(message: string, meta?: any): void {
    this.logger.error(message, meta);
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  http(message: string, meta?: any): void {
    this.logger.http(message, meta);
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  // Specialized logging methods
  logAuth(action: string, userId?: string, meta?: any): void {
    this.info(`Auth: ${action}`, {
      userId,
      action,
      ...meta,
      category: 'authentication'
    });
  }

  logAPI(method: string, endpoint: string, userId?: string, statusCode?: number, responseTime?: number, meta?: any): void {
    this.http(`${method} ${endpoint}`, {
      method,
      endpoint,
      userId,
      statusCode,
      responseTime,
      ...meta,
      category: 'api'
    });
  }

  logDatabase(operation: string, table?: string, meta?: any): void {
    this.debug(`DB: ${operation}`, {
      operation,
      table,
      ...meta,
      category: 'database'
    });
  }

  logTwitter(action: string, meta?: any): void {
    this.info(`Twitter: ${action}`, {
      action,
      ...meta,
      category: 'twitter'
    });
  }

  logSheets(action: string, meta?: any): void {
    this.info(`Sheets: ${action}`, {
      action,
      ...meta,
      category: 'sheets'
    });
  }

  logScheduler(action: string, meta?: any): void {
    this.info(`Scheduler: ${action}`, {
      action,
      ...meta,
      category: 'scheduler'
    });
  }

  logSecurity(event: string, userId?: string, ip?: string, meta?: any): void {
    this.warn(`Security: ${event}`, {
      event,
      userId,
      ip,
      ...meta,
      category: 'security'
    });
  }

  logPerformance(operation: string, duration: number, meta?: any): void {
    this.debug(`Performance: ${operation}`, {
      operation,
      duration,
      ...meta,
      category: 'performance'
    });
  }

  logError(error: Error, context?: string, meta?: any): void {
    this.error(`${context ? context + ': ' : ''}${error.message}`, {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context,
      ...meta,
      category: 'error'
    });
  }

  // Business logic logging
  logThreadAction(action: string, threadId: string, userId?: string, meta?: any): void {
    this.info(`Thread ${action}`, {
      action,
      threadId,
      userId,
      ...meta,
      category: 'thread'
    });
  }

  logMetricsCollection(threadId: string, metricsCount: number, meta?: any): void {
    this.info('Metrics collected', {
      threadId,
      metricsCount,
      ...meta,
      category: 'metrics'
    });
  }

  // System health logging
  logSystemHealth(component: string, status: 'healthy' | 'unhealthy', meta?: any): void {
    const level = status === 'healthy' ? 'info' : 'error';
    this.logger.log(level, `System Health: ${component} is ${status}`, {
      component,
      status,
      ...meta,
      category: 'health'
    });
  }

  // Create child logger with additional context
  child(defaultMeta: any): Logger {
    const childLogger = Object.create(this);
    childLogger.logger = this.logger.child(defaultMeta);
    return childLogger;
  }

  // Get the underlying winston logger
  getWinstonLogger(): winston.Logger {
    return this.logger;
  }
}

// Create and export singleton instance
export const logger = new Logger();

// Export types
export interface LogMeta {
  [key: string]: any;
}

export interface RequestLogMeta extends LogMeta {
  method?: string;
  url?: string;
  userAgent?: string;
  ip?: string;
  userId?: string;
  responseTime?: number;
  statusCode?: number;
}

export interface ErrorLogMeta extends LogMeta {
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  context?: string;
  userId?: string;
  ip?: string;
}

export default logger;