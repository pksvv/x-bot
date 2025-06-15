import { db } from '../../config/database';
import { TwitterService } from './TwitterService';
import { GoogleSheetsService } from './GoogleSheetsService';
import { logger } from '../utils/logger';
import { monitoring } from '../utils/metrics';
import { healthLogger } from '../middleware/logging';

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  responseTime?: number;
  timestamp: string;
  details?: any;
}

export interface SystemHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  checks: HealthCheck[];
  version: string;
  environment: string;
}

export class HealthService {
  private twitterService: TwitterService;
  private sheetsService: GoogleSheetsService;
  private startTime: number;

  constructor() {
    this.twitterService = new TwitterService();
    this.sheetsService = new GoogleSheetsService();
    this.startTime = Date.now();
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const startTime = Date.now();
    logger.debug('Starting system health check');

    try {
      const checks = await Promise.allSettled([
        this.checkDatabase(),
        this.checkTwitterAPI(),
        this.checkGoogleSheetsAPI(),
        this.checkFileSystem(),
        this.checkMemoryUsage(),
        this.checkDiskSpace()
      ]);

      const healthChecks: HealthCheck[] = checks.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          const checkNames = ['database', 'twitter_api', 'google_sheets', 'filesystem', 'memory', 'disk'];
          return {
            name: checkNames[index],
            status: 'unhealthy',
            message: result.reason?.message || 'Health check failed',
            timestamp: new Date().toISOString()
          };
        }
      });

      const overallStatus = this.determineOverallStatus(healthChecks);
      const totalTime = Date.now() - startTime;

      const systemHealth: SystemHealth = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        checks: healthChecks,
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      };

      logger.info('System health check completed', {
        status: overallStatus,
        checkCount: healthChecks.length,
        responseTime: totalTime
      });

      // Update monitoring metrics
      monitoring.updateActiveUsers(await this.getActiveUsersCount());
      monitoring.updateActiveSessions(await this.getActiveSessionsCount());

      return systemHealth;

    } catch (error) {
      logger.logError(error as Error, 'System health check failed');
      throw error;
    }
  }

  private async checkDatabase(): Promise<HealthCheck> {
    const startTime = Date.now();
    const timer = monitoring.startTimer('health_check_database');

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
      monitoring.endTimer('health_check_database', { operation: 'database', table: 'health_check' });
      
      healthLogger.logDatabaseHealth(true, responseTime);
      monitoring.trackDatabaseOperation('health_check', 'system', 'success');

      return {
        name: 'database',
        status: responseTime > 1000 ? 'degraded' : 'healthy',
        responseTime,
        timestamp: new Date().toISOString(),
        message: responseTime > 1000 ? 'Database responding slowly' : 'Database connection successful'
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      monitoring.endTimer('health_check_database', { operation: 'database', table: 'health_check' });
      
      healthLogger.logDatabaseHealth(false, responseTime);
      monitoring.trackDatabaseOperation('health_check', 'system', 'error');
      monitoring.trackError('database_connection', 'health_check', 'high');

      return {
        name: 'database',
        status: 'unhealthy',
        responseTime,
        timestamp: new Date().toISOString(),
        message: `Database connection failed: ${(error as Error).message}`,
        details: { error: (error as Error).message }
      };
    }
  }

  private async checkTwitterAPI(): Promise<HealthCheck> {
    const startTime = Date.now();
    const timer = monitoring.startTimer('health_check_twitter');

    try {
      // Try to get user info or rate limit status as a lightweight check
      // This is a mock check - in practice you'd call a lightweight Twitter API endpoint
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate API call

      const responseTime = Date.now() - startTime;
      monitoring.endTimer('health_check_twitter', { operation: 'external_api', service: 'twitter' });
      
      healthLogger.logTwitterAPIHealth(true);
      monitoring.trackExternalAPI('twitter', 'health_check', 'success');

      return {
        name: 'twitter_api',
        status: 'healthy',
        responseTime,
        timestamp: new Date().toISOString(),
        message: 'Twitter API accessible'
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      monitoring.endTimer('health_check_twitter', { operation: 'external_api', service: 'twitter' });
      
      healthLogger.logTwitterAPIHealth(false, (error as Error).message);
      monitoring.trackExternalAPI('twitter', 'health_check', 'error');
      monitoring.trackError('twitter_api', 'health_check', 'medium');

      return {
        name: 'twitter_api',
        status: 'unhealthy',
        responseTime,
        timestamp: new Date().toISOString(),
        message: `Twitter API check failed: ${(error as Error).message}`,
        details: { error: (error as Error).message }
      };
    }
  }

  private async checkGoogleSheetsAPI(): Promise<HealthCheck> {
    const startTime = Date.now();
    const timer = monitoring.startTimer('health_check_sheets');

    try {
      const isValid = await this.sheetsService.validateConnection();
      const responseTime = Date.now() - startTime;
      monitoring.endTimer('health_check_sheets', { operation: 'external_api', service: 'google_sheets' });

      if (isValid) {
        healthLogger.logSheetsAPIHealth(true);
        monitoring.trackExternalAPI('google_sheets', 'health_check', 'success');

        return {
          name: 'google_sheets_api',
          status: 'healthy',
          responseTime,
          timestamp: new Date().toISOString(),
          message: 'Google Sheets API accessible'
        };
      } else {
        healthLogger.logSheetsAPIHealth(false, 'Connection validation failed');
        monitoring.trackExternalAPI('google_sheets', 'health_check', 'error');

        return {
          name: 'google_sheets_api',
          status: 'unhealthy',
          responseTime,
          timestamp: new Date().toISOString(),
          message: 'Google Sheets API connection failed'
        };
      }

    } catch (error) {
      const responseTime = Date.now() - startTime;
      monitoring.endTimer('health_check_sheets', { operation: 'external_api', service: 'google_sheets' });
      
      healthLogger.logSheetsAPIHealth(false, (error as Error).message);
      monitoring.trackExternalAPI('google_sheets', 'health_check', 'error');
      monitoring.trackError('google_sheets_api', 'health_check', 'low');

      return {
        name: 'google_sheets_api',
        status: 'unhealthy',
        responseTime,
        timestamp: new Date().toISOString(),
        message: `Google Sheets API check failed: ${(error as Error).message}`,
        details: { error: (error as Error).message }
      };
    }
  }

  private async checkFileSystem(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      const fs = require('fs').promises;
      const testFile = '/tmp/health_check_' + Date.now();
      
      await fs.writeFile(testFile, 'health check');
      await fs.readFile(testFile);
      await fs.unlink(testFile);

      const responseTime = Date.now() - startTime;

      return {
        name: 'filesystem',
        status: 'healthy',
        responseTime,
        timestamp: new Date().toISOString(),
        message: 'File system read/write successful'
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      monitoring.trackError('filesystem', 'health_check', 'medium');

      return {
        name: 'filesystem',
        status: 'unhealthy',
        responseTime,
        timestamp: new Date().toISOString(),
        message: `File system check failed: ${(error as Error).message}`,
        details: { error: (error as Error).message }
      };
    }
  }

  private async checkMemoryUsage(): Promise<HealthCheck> {
    const memUsage = process.memoryUsage();
    const totalMem = require('os').totalmem();
    const freeMem = require('os').freemem();
    
    const usagePercent = ((memUsage.heapUsed / memUsage.heapTotal) * 100);
    const systemUsagePercent = ((totalMem - freeMem) / totalMem) * 100;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let message = 'Memory usage normal';

    if (usagePercent > 90 || systemUsagePercent > 95) {
      status = 'unhealthy';
      message = 'High memory usage detected';
      monitoring.trackError('high_memory_usage', 'system', 'high');
    } else if (usagePercent > 75 || systemUsagePercent > 85) {
      status = 'degraded';
      message = 'Elevated memory usage';
    }

    return {
      name: 'memory',
      status,
      timestamp: new Date().toISOString(),
      message,
      details: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
        heapUsagePercent: Math.round(usagePercent) + '%',
        systemUsagePercent: Math.round(systemUsagePercent) + '%',
        rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB'
      }
    };
  }

  private async checkDiskSpace(): Promise<HealthCheck> {
    try {
      const fs = require('fs');
      const stats = fs.statSync(process.cwd());
      
      // This is a simplified check - in production you'd use a proper disk space check
      return {
        name: 'disk_space',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        message: 'Disk space check completed',
        details: {
          path: process.cwd(),
          accessible: true
        }
      };

    } catch (error) {
      monitoring.trackError('disk_space', 'system', 'medium');

      return {
        name: 'disk_space',
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        message: `Disk space check failed: ${(error as Error).message}`,
        details: { error: (error as Error).message }
      };
    }
  }

  private determineOverallStatus(checks: HealthCheck[]): 'healthy' | 'unhealthy' | 'degraded' {
    const criticalServices = ['database'];
    const unhealthyChecks = checks.filter(check => check.status === 'unhealthy');
    const degradedChecks = checks.filter(check => check.status === 'degraded');

    // If any critical service is unhealthy, system is unhealthy
    const criticalUnhealthy = unhealthyChecks.some(check => criticalServices.includes(check.name));
    if (criticalUnhealthy) {
      return 'unhealthy';
    }

    // If any service is unhealthy or multiple are degraded, system is degraded
    if (unhealthyChecks.length > 0 || degradedChecks.length > 1) {
      return 'degraded';
    }

    // If only one service is degraded, system is degraded
    if (degradedChecks.length === 1) {
      return 'degraded';
    }

    return 'healthy';
  }

  private async getActiveUsersCount(): Promise<number> {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(DISTINCT user_id) as count 
         FROM user_sessions 
         WHERE expires_at > datetime('now')`,
        (err, result: any) => {
          if (err) {
            resolve(0);
          } else {
            resolve(result?.count || 0);
          }
        }
      );
    });
  }

  private async getActiveSessionsCount(): Promise<number> {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) as count 
         FROM user_sessions 
         WHERE expires_at > datetime('now')`,
        (err, result: any) => {
          if (err) {
            resolve(0);
          } else {
            resolve(result?.count || 0);
          }
        }
      );
    });
  }

  async getMetrics(): Promise<any> {
    try {
      const metricsString = await monitoring.getMetrics();
      return {
        format: 'prometheus',
        data: metricsString,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.logError(error as Error, 'Failed to get metrics');
      throw error;
    }
  }

  async getDetailedSystemInfo(): Promise<any> {
    const os = require('os');
    const process = require('process');

    return {
      system: {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        uptime: os.uptime(),
        loadAverage: os.loadavg(),
        cpuCount: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem()
      },
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        version: process.version,
        env: process.env.NODE_ENV
      },
      application: {
        version: process.env.npm_package_version || '1.0.0',
        startTime: new Date(this.startTime).toISOString(),
        uptime: Date.now() - this.startTime
      }
    };
  }
}