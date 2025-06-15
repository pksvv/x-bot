import * as cron from 'node-cron';
import { HealthService } from '../services/HealthService';
import { logger } from '../utils/logger';
import { monitoring } from '../utils/metrics';
import { db } from '../../config/database';

export class MonitoringJobs {
  private healthService: HealthService;
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  constructor() {
    this.healthService = new HealthService();
  }

  start(): void {
    logger.info('Starting monitoring jobs');

    try {
      // Health check job - every 5 minutes
      const healthCheckJob = cron.schedule('*/5 * * * *', async () => {
        await this.performHealthCheck();
      }, {
        scheduled: false,
        name: 'health-check'
      });

      // Metrics collection job - every minute
      const metricsJob = cron.schedule('* * * * *', async () => {
        await this.collectSystemMetrics();
      }, {
        scheduled: false,
        name: 'metrics-collection'
      });

      // Log cleanup job - daily at 2 AM
      const logCleanupJob = cron.schedule('0 2 * * *', async () => {
        await this.performLogCleanup();
      }, {
        scheduled: false,
        name: 'log-cleanup'
      });

      // Database cleanup job - daily at 3 AM
      const dbCleanupJob = cron.schedule('0 3 * * *', async () => {
        await this.performDatabaseCleanup();
      }, {
        scheduled: false,
        name: 'database-cleanup'
      });

      // Performance monitoring job - every 15 minutes
      const performanceJob = cron.schedule('*/15 * * * *', async () => {
        await this.monitorPerformance();
      }, {
        scheduled: false,
        name: 'performance-monitoring'
      });

      // Security monitoring job - every 10 minutes
      const securityJob = cron.schedule('*/10 * * * *', async () => {
        await this.monitorSecurity();
      }, {
        scheduled: false,
        name: 'security-monitoring'
      });

      // Store jobs for management
      this.jobs.set('health-check', healthCheckJob);
      this.jobs.set('metrics-collection', metricsJob);
      this.jobs.set('log-cleanup', logCleanupJob);
      this.jobs.set('database-cleanup', dbCleanupJob);
      this.jobs.set('performance-monitoring', performanceJob);
      this.jobs.set('security-monitoring', securityJob);

      // Start all jobs
      this.jobs.forEach((job, name) => {
        job.start();
        logger.info(`Started monitoring job: ${name}`);
      });

      logger.info('All monitoring jobs started successfully');

    } catch (error) {
      logger.logError(error as Error, 'Failed to start monitoring jobs');
      monitoring.trackError('monitoring_jobs_start', 'scheduler', 'critical');
    }
  }

  stop(): void {
    logger.info('Stopping monitoring jobs');

    this.jobs.forEach((job, name) => {
      try {
        job.stop();
        logger.info(`Stopped monitoring job: ${name}`);
      } catch (error) {
        logger.logError(error as Error, `Failed to stop monitoring job: ${name}`);
      }
    });

    this.jobs.clear();
    logger.info('All monitoring jobs stopped');
  }

  private async performHealthCheck(): Promise<void> {
    const timer = monitoring.startTimer('health_check_job');

    try {
      logger.debug('Performing scheduled health check');
      
      const health = await this.healthService.getSystemHealth();
      
      // Log health status
      logger.logSystemHealth('system', health.status);
      
      // Track metrics
      monitoring.trackScheduledJob('health_check', 'success');
      
      // Alert on unhealthy status
      if (health.status === 'unhealthy') {
        logger.error('System health check failed', {
          status: health.status,
          failedChecks: health.checks.filter(check => check.status === 'unhealthy').map(check => check.name)
        });
        
        monitoring.trackError('system_unhealthy', 'health_check', 'critical');
      } else if (health.status === 'degraded') {
        logger.warn('System health degraded', {
          status: health.status,
          degradedChecks: health.checks.filter(check => check.status === 'degraded').map(check => check.name)
        });
      }

      logger.debug('Health check completed', { status: health.status });

    } catch (error) {
      logger.logError(error as Error, 'Scheduled health check failed');
      monitoring.trackScheduledJob('health_check', 'error');
      monitoring.trackError('health_check_job', 'scheduler', 'high');
    } finally {
      monitoring.endTimer('health_check_job', { operation: 'scheduled_job', job_type: 'health_check' });
    }
  }

  private async collectSystemMetrics(): Promise<void> {
    try {
      // Update active user and session counts
      const activeUsers = await this.getActiveUsersCount();
      const activeSessions = await this.getActiveSessionsCount();
      
      monitoring.updateActiveUsers(activeUsers);
      monitoring.updateActiveSessions(activeSessions);

      // Update queue sizes (if you have processing queues)
      // monitoring.updateQueueSize('tweet_publishing', queueSize);

      monitoring.trackScheduledJob('metrics_collection', 'success');

    } catch (error) {
      logger.logError(error as Error, 'System metrics collection failed');
      monitoring.trackScheduledJob('metrics_collection', 'error');
    }
  }

  private async performLogCleanup(): Promise<void> {
    const timer = monitoring.startTimer('log_cleanup_job');

    try {
      logger.info('Starting log cleanup job');

      // This would typically involve:
      // 1. Compressing old log files
      // 2. Deleting logs older than retention period
      // 3. Archiving important logs
      
      const fs = require('fs').promises;
      const path = require('path');
      const logsDir = path.join(process.cwd(), 'logs');

      try {
        const files = await fs.readdir(logsDir);
        const now = Date.now();
        const retentionPeriod = 30 * 24 * 60 * 60 * 1000; // 30 days

        let cleanedFiles = 0;

        for (const file of files) {
          const filePath = path.join(logsDir, file);
          const stats = await fs.stat(filePath);
          
          if (now - stats.mtime.getTime() > retentionPeriod) {
            await fs.unlink(filePath);
            cleanedFiles++;
            logger.debug(`Cleaned up old log file: ${file}`);
          }
        }

        logger.info('Log cleanup completed', { 
          cleanedFiles,
          retentionDays: 30
        });

        monitoring.trackScheduledJob('log_cleanup', 'success');

      } catch (error) {
        // Logs directory might not exist yet
        logger.debug('No logs directory found for cleanup');
        monitoring.trackScheduledJob('log_cleanup', 'success');
      }

    } catch (error) {
      logger.logError(error as Error, 'Log cleanup job failed');
      monitoring.trackScheduledJob('log_cleanup', 'error');
    } finally {
      monitoring.endTimer('log_cleanup_job', { operation: 'scheduled_job', job_type: 'log_cleanup' });
    }
  }

  private async performDatabaseCleanup(): Promise<void> {
    const timer = monitoring.startTimer('database_cleanup_job');

    try {
      logger.info('Starting database cleanup job');

      // Clean up expired sessions
      await new Promise<void>((resolve, reject) => {
        db.run(
          `DELETE FROM user_sessions WHERE expires_at < datetime('now')`,
          [],
          function(err) {
            if (err) {
              reject(err);
            } else {
              logger.info('Cleaned up expired sessions', { deletedCount: this.changes });
              resolve();
            }
          }
        );
      });

      // Clean up old metrics (keep last 90 days)
      await new Promise<void>((resolve, reject) => {
        db.run(
          `DELETE FROM metrics WHERE recorded_at < datetime('now', '-90 days')`,
          [],
          function(err) {
            if (err) {
              reject(err);
            } else {
              logger.info('Cleaned up old metrics', { deletedCount: this.changes });
              resolve();
            }
          }
        );
      });

      // Vacuum database to reclaim space
      await new Promise<void>((resolve, reject) => {
        db.run('VACUUM', [], (err) => {
          if (err) {
            reject(err);
          } else {
            logger.info('Database vacuum completed');
            resolve();
          }
        });
      });

      monitoring.trackScheduledJob('database_cleanup', 'success');

    } catch (error) {
      logger.logError(error as Error, 'Database cleanup job failed');
      monitoring.trackScheduledJob('database_cleanup', 'error');
    } finally {
      monitoring.endTimer('database_cleanup_job', { operation: 'scheduled_job', job_type: 'database_cleanup' });
    }
  }

  private async monitorPerformance(): Promise<void> {
    try {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      // Check for memory issues
      const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      
      if (heapUsagePercent > 90) {
        logger.warn('High memory usage detected', {
          heapUsagePercent: Math.round(heapUsagePercent),
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB'
        });
        
        monitoring.trackError('high_memory_usage', 'performance_monitor', 'medium');
      }

      // Check for high CPU usage (simplified check)
      // In production, you'd want more sophisticated CPU monitoring
      
      monitoring.trackScheduledJob('performance_monitoring', 'success');

    } catch (error) {
      logger.logError(error as Error, 'Performance monitoring failed');
      monitoring.trackScheduledJob('performance_monitoring', 'error');
    }
  }

  private async monitorSecurity(): Promise<void> {
    try {
      // Check for suspicious activity patterns
      // This would typically query logs for:
      // - Multiple failed login attempts
      // - Unusual API usage patterns
      // - Rate limit violations
      // - Privilege escalation attempts

      // For now, just track that the job ran
      monitoring.trackScheduledJob('security_monitoring', 'success');

    } catch (error) {
      logger.logError(error as Error, 'Security monitoring failed');
      monitoring.trackScheduledJob('security_monitoring', 'error');
    }
  }

  private async getActiveUsersCount(): Promise<number> {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(DISTINCT user_id) as count 
         FROM user_sessions 
         WHERE expires_at > datetime('now')`,
        (err, result: any) => {
          if (err) {
            logger.logError(err, 'Failed to get active users count');
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
            logger.logError(err, 'Failed to get active sessions count');
            resolve(0);
          } else {
            resolve(result?.count || 0);
          }
        }
      );
    });
  }

  // Get job status
  getJobStatus(): any {
    const status: any = {};
    
    this.jobs.forEach((job, name) => {
      status[name] = {
        running: job.running || false,
        scheduled: true
      };
    });

    return status;
  }

  // Restart a specific job
  restartJob(jobName: string): boolean {
    const job = this.jobs.get(jobName);
    if (job) {
      try {
        job.stop();
        job.start();
        logger.info(`Restarted monitoring job: ${jobName}`);
        return true;
      } catch (error) {
        logger.logError(error as Error, `Failed to restart monitoring job: ${jobName}`);
        return false;
      }
    }
    return false;
  }
}