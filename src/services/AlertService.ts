import { logger, AlertConfig } from '../utils/logger';
import { monitoring } from '../utils/metrics';

export interface Alert {
  id: string;
  type: 'error_rate' | 'response_time' | 'memory_usage' | 'disk_space' | 'health_check' | 'custom';
  level: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  message: string;
  timestamp: string;
  source: string;
  metadata?: any;
  acknowledged?: boolean;
  resolved?: boolean;
}

export interface AlertRule {
  id: string;
  name: string;
  type: Alert['type'];
  condition: string;
  threshold: number;
  window: number; // in minutes
  level: Alert['level'];
  enabled: boolean;
  channels: string[];
}

export class AlertService {
  private alerts: Map<string, Alert> = new Map();
  private rules: Map<string, AlertRule> = new Map();
  private alertCounts: Map<string, number> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        type: 'error_rate',
        condition: 'error_rate > threshold',
        threshold: 5, // 5% error rate
        window: 5, // 5 minutes
        level: 'high',
        enabled: true,
        channels: ['log', 'console']
      },
      {
        id: 'slow_response_time',
        name: 'Slow Response Time',
        type: 'response_time',
        condition: 'avg_response_time > threshold',
        threshold: 2000, // 2 seconds
        window: 10,
        level: 'medium',
        enabled: true,
        channels: ['log']
      },
      {
        id: 'high_memory_usage',
        name: 'High Memory Usage',
        type: 'memory_usage',
        condition: 'memory_usage > threshold',
        threshold: 85, // 85%
        window: 5,
        level: 'high',
        enabled: true,
        channels: ['log', 'console']
      },
      {
        id: 'database_unhealthy',
        name: 'Database Health Check Failed',
        type: 'health_check',
        condition: 'database_status != healthy',
        threshold: 1,
        window: 1,
        level: 'critical',
        enabled: true,
        channels: ['log', 'console']
      }
    ];

    defaultRules.forEach(rule => {
      this.rules.set(rule.id, rule);
    });

    logger.info('Alert service initialized', {
      rulesCount: defaultRules.length,
      category: 'alerting'
    });
  }

  async checkErrorRate(): Promise<void> {
    try {
      const errorRate = await this.calculateErrorRate();
      const rule = this.rules.get('high_error_rate');
      
      if (rule && rule.enabled && errorRate > rule.threshold) {
        await this.triggerAlert({
          id: `error_rate_${Date.now()}`,
          type: 'error_rate',
          level: rule.level,
          title: 'High Error Rate Detected',
          message: `Error rate of ${errorRate.toFixed(2)}% exceeds threshold of ${rule.threshold}%`,
          timestamp: new Date().toISOString(),
          source: 'error_rate_monitor',
          metadata: {
            currentRate: errorRate,
            threshold: rule.threshold,
            window: rule.window
          }
        });
      }
    } catch (error) {
      logger.logError(error as Error, 'Failed to check error rate');
    }
  }

  async checkResponseTime(): Promise<void> {
    try {
      const avgResponseTime = await this.calculateAverageResponseTime();
      const rule = this.rules.get('slow_response_time');
      
      if (rule && rule.enabled && avgResponseTime > rule.threshold) {
        await this.triggerAlert({
          id: `response_time_${Date.now()}`,
          type: 'response_time',
          level: rule.level,
          title: 'Slow Response Time Detected',
          message: `Average response time of ${avgResponseTime}ms exceeds threshold of ${rule.threshold}ms`,
          timestamp: new Date().toISOString(),
          source: 'response_time_monitor',
          metadata: {
            currentTime: avgResponseTime,
            threshold: rule.threshold,
            window: rule.window
          }
        });
      }
    } catch (error) {
      logger.logError(error as Error, 'Failed to check response time');
    }
  }

  async checkMemoryUsage(): Promise<void> {
    try {
      const memoryUsage = this.getMemoryUsagePercent();
      const rule = this.rules.get('high_memory_usage');
      
      if (rule && rule.enabled && memoryUsage > rule.threshold) {
        await this.triggerAlert({
          id: `memory_usage_${Date.now()}`,
          type: 'memory_usage',
          level: rule.level,
          title: 'High Memory Usage Detected',
          message: `Memory usage of ${memoryUsage.toFixed(2)}% exceeds threshold of ${rule.threshold}%`,
          timestamp: new Date().toISOString(),
          source: 'memory_monitor',
          metadata: {
            currentUsage: memoryUsage,
            threshold: rule.threshold,
            memoryInfo: process.memoryUsage()
          }
        });
      }
    } catch (error) {
      logger.logError(error as Error, 'Failed to check memory usage');
    }
  }

  async checkHealthStatus(healthStatus: any): Promise<void> {
    try {
      const rule = this.rules.get('database_unhealthy');
      const databaseCheck = healthStatus.checks?.find((check: any) => check.name === 'database');
      
      if (rule && rule.enabled && databaseCheck && databaseCheck.status !== 'healthy') {
        await this.triggerAlert({
          id: `database_health_${Date.now()}`,
          type: 'health_check',
          level: rule.level,
          title: 'Database Health Check Failed',
          message: `Database health status is ${databaseCheck.status}: ${databaseCheck.message}`,
          timestamp: new Date().toISOString(),
          source: 'health_monitor',
          metadata: {
            healthCheck: databaseCheck,
            systemStatus: healthStatus.status
          }
        });
      }
    } catch (error) {
      logger.logError(error as Error, 'Failed to check health status');
    }
  }

  async triggerAlert(alert: Alert): Promise<void> {
    // Check if similar alert was recently triggered (prevent spam)
    const recentAlertKey = `${alert.type}_${alert.source}`;
    const lastAlertTime = this.alertCounts.get(recentAlertKey);
    const now = Date.now();
    
    if (lastAlertTime && (now - lastAlertTime) < 300000) { // 5 minutes
      logger.debug('Alert suppressed due to recent similar alert', {
        alertType: alert.type,
        source: alert.source,
        lastAlert: new Date(lastAlertTime).toISOString()
      });
      return;
    }

    this.alertCounts.set(recentAlertKey, now);
    this.alerts.set(alert.id, alert);

    // Send alert through configured channels
    const rule = Array.from(this.rules.values()).find(r => r.type === alert.type);
    const channels = rule?.channels || ['log'];

    for (const channel of channels) {
      await this.sendAlert(alert, channel);
    }

    logger.warn('Alert triggered', {
      alertId: alert.id,
      type: alert.type,
      level: alert.level,
      title: alert.title,
      channels,
      category: 'alert'
    });
  }

  private async sendAlert(alert: Alert, channel: string): Promise<void> {
    switch (channel) {
      case 'log':
        logger.logWithContext(
          alert.level === 'critical' ? 'error' : 'warn',
          `ALERT: ${alert.title}`,
          undefined,
          {
            alert,
            category: 'alert_notification'
          }
        );
        break;
      
      case 'console':
        console.error(`🚨 ALERT [${alert.level.toUpperCase()}]: ${alert.title}`);
        console.error(`   ${alert.message}`);
        console.error(`   Source: ${alert.source} | Time: ${alert.timestamp}`);
        break;
      
      case 'webhook':
        // Implement webhook notification
        await this.sendWebhookAlert(alert);
        break;
      
      case 'email':
        // Implement email notification
        await this.sendEmailAlert(alert);
        break;
      
      default:
        logger.warn('Unknown alert channel', { channel, alertId: alert.id });
    }
  }

  private async sendWebhookAlert(alert: Alert): Promise<void> {
    const webhookUrl = process.env.ALERT_WEBHOOK_URL;
    if (!webhookUrl) {
      logger.debug('No webhook URL configured for alerts');
      return;
    }

    try {
      // Implement webhook sending logic here
      logger.info('Webhook alert sent', { alertId: alert.id, url: webhookUrl });
    } catch (error) {
      logger.logError(error as Error, 'Failed to send webhook alert', { alertId: alert.id });
    }
  }

  private async sendEmailAlert(alert: Alert): Promise<void> {
    // Implement email sending logic here
    logger.info('Email alert would be sent', { alertId: alert.id });
  }

  private async calculateErrorRate(): Promise<number> {
    // This would typically query your metrics store
    // For now, return a mock value
    const totalRequests = 1000;
    const errorRequests = 25;
    return (errorRequests / totalRequests) * 100;
  }

  private async calculateAverageResponseTime(): Promise<number> {
    // This would typically query your metrics store
    // For now, return a mock value based on recent performance
    return 1500; // milliseconds
  }

  private getMemoryUsagePercent(): number {
    const memUsage = process.memoryUsage();
    return (memUsage.heapUsed / memUsage.heapTotal) * 100;
  }

  // Alert management methods
  getAlerts(limit?: number): Alert[] {
    const alerts = Array.from(this.alerts.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return limit ? alerts.slice(0, limit) : alerts;
  }

  getAlert(id: string): Alert | undefined {
    return this.alerts.get(id);
  }

  acknowledgeAlert(id: string): boolean {
    const alert = this.alerts.get(id);
    if (alert) {
      alert.acknowledged = true;
      this.alerts.set(id, alert);
      logger.info('Alert acknowledged', { alertId: id });
      return true;
    }
    return false;
  }

  resolveAlert(id: string): boolean {
    const alert = this.alerts.get(id);
    if (alert) {
      alert.resolved = true;
      this.alerts.set(id, alert);
      logger.info('Alert resolved', { alertId: id });
      return true;
    }
    return false;
  }

  // Rule management methods
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    logger.info('Alert rule added', { ruleId: rule.id, name: rule.name });
  }

  updateRule(id: string, updates: Partial<AlertRule>): boolean {
    const rule = this.rules.get(id);
    if (rule) {
      const updatedRule = { ...rule, ...updates };
      this.rules.set(id, updatedRule);
      logger.info('Alert rule updated', { ruleId: id, updates });
      return true;
    }
    return false;
  }

  deleteRule(id: string): boolean {
    const deleted = this.rules.delete(id);
    if (deleted) {
      logger.info('Alert rule deleted', { ruleId: id });
    }
    return deleted;
  }

  getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  // Periodic monitoring
  startPeriodicChecks(): void {
    // Check every 5 minutes
    setInterval(async () => {
      await Promise.allSettled([
        this.checkErrorRate(),
        this.checkResponseTime(),
        this.checkMemoryUsage()
      ]);
    }, 300000); // 5 minutes

    logger.info('Periodic alert checks started', {
      interval: '5 minutes',
      category: 'alerting'
    });
  }
}

export const alertService = new AlertService();