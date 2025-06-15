import { Request, Response } from 'express';
import { HealthService } from '../services/HealthService';
import { monitoring } from '../utils/metrics';
import { logger } from '../utils/logger';
import { AuthRequest } from '../types';
import { alertService, Alert, AlertRule } from '../services/AlertService';
import { asyncHandler } from '../middleware/errorHandler';

export class MonitoringController {
  private healthService: HealthService;

  constructor() {
    this.healthService = new HealthService();
  }

  // Health check endpoint - public access for load balancers
  healthCheck = async (req: Request, res: Response): Promise<void> => {
    try {
      const health = await this.healthService.getSystemHealth();
      
      const statusCode = health.status === 'healthy' ? 200 : 
                        health.status === 'degraded' ? 200 : 503;

      res.status(statusCode).json({
        success: true,
        data: health
      });

    } catch (error) {
      logger.logError(error as Error, 'Health check failed');
      res.status(503).json({
        success: false,
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      });
    }
  };

  // Simple health check for load balancers
  ping = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  };

  // Detailed system information (admin only)
  getSystemInfo = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
        return;
      }

      const systemInfo = await this.healthService.getDetailedSystemInfo();
      
      res.status(200).json({
        success: true,
        data: systemInfo
      });

    } catch (error) {
      logger.logError(error as Error, 'Failed to get system info');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve system information'
      });
    }
  };

  // Prometheus metrics endpoint
  getMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      const metrics = await monitoring.getMetrics();
      
      res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.status(200).send(metrics);

    } catch (error) {
      logger.logError(error as Error, 'Failed to get metrics');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve metrics'
      });
    }
  };

  // Application metrics summary (admin only)
  getMetricsSummary = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
        return;
      }

      const metricsData = await this.healthService.getMetrics();
      
      // Parse and summarize key metrics
      const summary = this.parseMetricsSummary(metricsData.data);
      
      res.status(200).json({
        success: true,
        data: {
          summary,
          timestamp: metricsData.timestamp,
          format: metricsData.format
        }
      });

    } catch (error) {
      logger.logError(error as Error, 'Failed to get metrics summary');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve metrics summary'
      });
    }
  };

  // Log analytics (admin only)
  getLogAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
        return;
      }

      // This would typically query log aggregation system
      // For now, return basic analytics
      const analytics = {
        logLevels: {
          error: this.getMetricValue('twitter_thread_bot_errors_total') || 0,
          warn: 0, // Would be extracted from logs
          info: 0,
          debug: 0
        },
        categories: {
          authentication: 0,
          api: 0,
          database: 0,
          twitter: 0,
          sheets: 0,
          scheduler: 0
        },
        recentErrors: [], // Would be extracted from recent logs
        timeline: [] // Would be extracted from log aggregation
      };

      res.status(200).json({
        success: true,
        data: analytics,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.logError(error as Error, 'Failed to get log analytics');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve log analytics'
      });
    }
  };

  // Performance metrics (admin only)
  getPerformanceMetrics = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
        return;
      }

      const performance = {
        httpRequests: {
          total: this.getMetricValue('twitter_thread_bot_http_requests_total') || 0,
          averageResponseTime: this.getMetricValue('twitter_thread_bot_http_request_duration_seconds') || 0,
          errorRate: 0 // Would be calculated from metrics
        },
        database: {
          operations: this.getMetricValue('twitter_thread_bot_database_operations_total') || 0,
          averageResponseTime: this.getMetricValue('twitter_thread_bot_database_operation_duration_seconds') || 0
        },
        externalAPIs: {
          twitter: {
            requests: this.getMetricValue('twitter_thread_bot_external_api_requests_total{service="twitter"}') || 0,
            averageResponseTime: 0
          },
          googleSheets: {
            requests: this.getMetricValue('twitter_thread_bot_external_api_requests_total{service="google_sheets"}') || 0,
            averageResponseTime: 0
          }
        },
        system: {
          memoryUsage: process.memoryUsage(),
          cpuUsage: process.cpuUsage(),
          uptime: process.uptime()
        }
      };

      res.status(200).json({
        success: true,
        data: performance,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.logError(error as Error, 'Failed to get performance metrics');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve performance metrics'
      });
    }
  };

  // Security metrics (admin only)
  getSecurityMetrics = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
        return;
      }

      const security = {
        authentication: {
          totalAttempts: this.getMetricValue('twitter_thread_bot_auth_attempts_total') || 0,
          successfulAttempts: this.getMetricValue('twitter_thread_bot_auth_attempts_total{status="success"}') || 0,
          failedAttempts: this.getMetricValue('twitter_thread_bot_auth_attempts_total{status="failure"}') || 0
        },
        rateLimiting: {
          hits: this.getMetricValue('twitter_thread_bot_rate_limit_hits_total') || 0,
          uniqueIPs: 0 // Would be calculated from logs
        },
        activeSessions: this.getMetricValue('twitter_thread_bot_user_sessions_active') || 0,
        activeUsers: this.getMetricValue('twitter_thread_bot_active_users') || 0,
        suspiciousActivity: [] // Would be extracted from security logs
      };

      res.status(200).json({
        success: true,
        data: security,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.logError(error as Error, 'Failed to get security metrics');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve security metrics'
      });
    }
  };

  // Business metrics (admin only)
  getBusinessMetrics = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
        return;
      }

      const business = {
        threads: {
          total: this.getMetricValue('twitter_thread_bot_threads_total') || 0,
          published: this.getMetricValue('twitter_thread_bot_threads_total{status="published"}') || 0,
          scheduled: this.getMetricValue('twitter_thread_bot_threads_total{status="scheduled"}') || 0,
          failed: this.getMetricValue('twitter_thread_bot_threads_total{status="failed"}') || 0
        },
        tweets: {
          published: this.getMetricValue('twitter_thread_bot_tweets_published_total') || 0
        },
        metrics: {
          collectionsTotal: this.getMetricValue('twitter_thread_bot_metrics_collection_total') || 0,
          collectionsSuccessful: this.getMetricValue('twitter_thread_bot_metrics_collection_total{status="success"}') || 0
        },
        sheets: {
          operations: this.getMetricValue('twitter_thread_bot_sheets_operations_total') || 0,
          syncs: this.getMetricValue('twitter_thread_bot_sheets_operations_total{operation="sync"}') || 0
        },
        scheduler: {
          jobsExecuted: this.getMetricValue('twitter_thread_bot_scheduled_jobs_executed_total') || 0,
          jobsSuccessful: this.getMetricValue('twitter_thread_bot_scheduled_jobs_executed_total{status="success"}') || 0
        }
      };

      res.status(200).json({
        success: true,
        data: business,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.logError(error as Error, 'Failed to get business metrics');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve business metrics'
      });
    }
  };

  // Helper method to parse metric values from Prometheus format
  private parseMetricsSummary(metricsString: string): any {
    const lines = metricsString.split('\n');
    const summary: any = {};

    lines.forEach(line => {
      if (line.startsWith('twitter_thread_bot_') && !line.startsWith('#')) {
        const [metricName, value] = line.split(' ');
        if (metricName && value) {
          summary[metricName] = parseFloat(value);
        }
      }
    });

    return summary;
  }

  // Helper method to get metric value (simplified implementation)
  private getMetricValue(metricName: string): number {
    try {
      // In a real implementation, you would query the metrics registry
      // This is a simplified version - for now just return 0
      return 0;
    } catch (error) {
      return 0;
    }
  }
}