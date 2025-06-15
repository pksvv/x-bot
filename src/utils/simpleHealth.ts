import { logger } from './logger';
import { db } from '../../config/database';

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy';
  message?: string;
  responseTime?: number;
  timestamp: string;
}

export interface SystemHealth {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: HealthCheck[];
  version: string;
  environment: string;
}

class SimpleHealthService {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const startTime = Date.now();
    
    try {
      const checks = await Promise.allSettled([
        this.checkDatabase(),
        this.checkMemoryUsage()
      ]);

      const healthChecks: HealthCheck[] = checks.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          const checkNames = ['database', 'memory'];
          return {
            name: checkNames[index] || 'unknown',
            status: 'unhealthy' as const,
            message: result.reason?.message || 'Health check failed',
            timestamp: new Date().toISOString()
          };
        }
      });

      const overallStatus = healthChecks.every(check => check.status === 'healthy') ? 'healthy' : 'unhealthy';
      const totalTime = Date.now() - startTime;

      const systemHealth: SystemHealth = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        checks: healthChecks,
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      };

      logger.debug('Health check completed', {
        status: overallStatus,
        responseTime: totalTime
      });

      return systemHealth;

    } catch (error) {
      logger.logError(error as Error, 'System health check failed');
      throw error;
    }
  }

  private async checkDatabase(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      await new Promise<void>((resolve, reject) => {
        db.get('SELECT 1 as test', (err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      const responseTime = Date.now() - startTime;

      return {
        name: 'database',
        status: 'healthy',
        responseTime,
        timestamp: new Date().toISOString(),
        message: 'Database connection successful'
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        name: 'database',
        status: 'unhealthy',
        responseTime,
        timestamp: new Date().toISOString(),
        message: `Database connection failed: ${(error as Error).message}`
      };
    }
  }

  private async checkMemoryUsage(): Promise<HealthCheck> {
    const memUsage = process.memoryUsage();
    const usagePercent = ((memUsage.heapUsed / memUsage.heapTotal) * 100);

    let status: 'healthy' | 'unhealthy' = 'healthy';
    let message = 'Memory usage normal';

    if (usagePercent > 90) {
      status = 'unhealthy';
      message = 'High memory usage detected';
    }

    return {
      name: 'memory',
      status,
      timestamp: new Date().toISOString(),
      message,
      responseTime: Math.round(usagePercent)
    };
  }

  // Simple ping endpoint
  getPing(): { status: string; timestamp: string; uptime: number } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000)
    };
  }

  // Get basic system info
  getSystemInfo(): any {
    const memUsage = process.memoryUsage();
    
    return {
      system: {
        platform: process.platform,
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        memory: {
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
          rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB'
        }
      },
      application: {
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        startTime: new Date(this.startTime).toISOString()
      }
    };
  }
}

export const simpleHealth = new SimpleHealthService();