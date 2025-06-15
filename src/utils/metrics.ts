import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';

// Initialize default metrics collection
collectDefaultMetrics({
  prefix: 'twitter_thread_bot_',
  register
});

// Custom metrics
export const httpRequestsTotal = new Counter({
  name: 'twitter_thread_bot_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'user_id']
});

export const httpRequestDuration = new Histogram({
  name: 'twitter_thread_bot_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

export const activeUsers = new Gauge({
  name: 'twitter_thread_bot_active_users',
  help: 'Number of active users in the last 24 hours'
});

export const threadsTotal = new Counter({
  name: 'twitter_thread_bot_threads_total',
  help: 'Total number of threads created',
  labelNames: ['status', 'user_id']
});

export const tweetsPublished = new Counter({
  name: 'twitter_thread_bot_tweets_published_total',
  help: 'Total number of tweets published',
  labelNames: ['user_id']
});

export const authAttempts = new Counter({
  name: 'twitter_thread_bot_auth_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['type', 'status', 'method']
});

export const databaseOperations = new Counter({
  name: 'twitter_thread_bot_database_operations_total',
  help: 'Total number of database operations',
  labelNames: ['operation', 'table', 'status']
});

export const databaseOperationDuration = new Histogram({
  name: 'twitter_thread_bot_database_operation_duration_seconds',
  help: 'Duration of database operations in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

export const externalAPIRequests = new Counter({
  name: 'twitter_thread_bot_external_api_requests_total',
  help: 'Total number of external API requests',
  labelNames: ['service', 'status', 'endpoint']
});

export const externalAPIResponseTime = new Histogram({
  name: 'twitter_thread_bot_external_api_response_time_seconds',
  help: 'Response time of external API requests in seconds',
  labelNames: ['service', 'endpoint'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
});

export const scheduledJobsExecuted = new Counter({
  name: 'twitter_thread_bot_scheduled_jobs_executed_total',
  help: 'Total number of scheduled jobs executed',
  labelNames: ['job_type', 'status']
});

export const metricsCollectionTotal = new Counter({
  name: 'twitter_thread_bot_metrics_collection_total',
  help: 'Total number of metrics collection operations',
  labelNames: ['status', 'thread_id']
});

export const sheetsOperations = new Counter({
  name: 'twitter_thread_bot_sheets_operations_total',
  help: 'Total number of Google Sheets operations',
  labelNames: ['operation', 'status']
});

export const rateLimitHits = new Counter({
  name: 'twitter_thread_bot_rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['endpoint', 'user_id']
});

export const cacheOperations = new Counter({
  name: 'twitter_thread_bot_cache_operations_total',
  help: 'Total number of cache operations',
  labelNames: ['operation', 'status']
});

export const errorTotal = new Counter({
  name: 'twitter_thread_bot_errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'component', 'severity']
});

export const userSessions = new Gauge({
  name: 'twitter_thread_bot_user_sessions_active',
  help: 'Number of active user sessions'
});

export const queueSize = new Gauge({
  name: 'twitter_thread_bot_queue_size',
  help: 'Current size of processing queues',
  labelNames: ['queue_type']
});

// Monitoring utility class
export class MonitoringService {
  private startTimes: Map<string, number> = new Map();

  // Track HTTP requests
  trackHttpRequest(method: string, route: string, statusCode: number, userId?: string): void {
    httpRequestsTotal.inc({
      method,
      route,
      status_code: statusCode.toString(),
      user_id: userId || 'anonymous'
    });
  }

  // Start timing an operation
  startTimer(operationId: string): void {
    this.startTimes.set(operationId, Date.now());
  }

  // End timing and record duration
  endTimer(operationId: string, labels: any = {}): number {
    const startTime = this.startTimes.get(operationId);
    if (!startTime) {
      return 0;
    }

    const duration = (Date.now() - startTime) / 1000;
    this.startTimes.delete(operationId);

    // Record in appropriate histogram based on operation type
    if (labels.operation === 'http') {
      httpRequestDuration.observe(labels, duration);
    } else if (labels.operation === 'database') {
      databaseOperationDuration.observe(labels, duration);
    } else if (labels.operation === 'external_api') {
      externalAPIResponseTime.observe(labels, duration);
    }

    return duration;
  }

  // Track authentication attempts
  trackAuthAttempt(type: 'login' | 'register' | 'api_key', status: 'success' | 'failure', method: 'jwt' | 'api_key' | 'session'): void {
    authAttempts.inc({ type, status, method });
  }

  // Track thread operations
  trackThreadOperation(status: 'created' | 'published' | 'scheduled' | 'failed', userId?: string): void {
    threadsTotal.inc({ status, user_id: userId || 'unknown' });
  }

  // Track tweet publishing
  trackTweetPublished(userId?: string): void {
    tweetsPublished.inc({ user_id: userId || 'unknown' });
  }

  // Track database operations
  trackDatabaseOperation(operation: string, table: string, status: 'success' | 'error'): void {
    databaseOperations.inc({ operation, table, status });
  }

  // Track external API calls
  trackExternalAPI(service: 'twitter' | 'google_sheets', endpoint: string, status: 'success' | 'error'): void {
    externalAPIRequests.inc({ service, status, endpoint });
  }

  // Track scheduled jobs
  trackScheduledJob(jobType: string, status: 'success' | 'error'): void {
    scheduledJobsExecuted.inc({ job_type: jobType, status });
  }

  // Track metrics collection
  trackMetricsCollection(status: 'success' | 'error', threadId?: string): void {
    metricsCollectionTotal.inc({ status, thread_id: threadId || 'bulk' });
  }

  // Track Google Sheets operations
  trackSheetsOperation(operation: 'read' | 'write' | 'sync', status: 'success' | 'error'): void {
    sheetsOperations.inc({ operation, status });
  }

  // Track rate limit hits
  trackRateLimitHit(endpoint: string, userId?: string): void {
    rateLimitHits.inc({ endpoint, user_id: userId || 'anonymous' });
  }

  // Track errors
  trackError(type: string, component: string, severity: 'low' | 'medium' | 'high' | 'critical'): void {
    errorTotal.inc({ type, component, severity });
  }

  // Update active users count
  updateActiveUsers(count: number): void {
    activeUsers.set(count);
  }

  // Update active sessions count
  updateActiveSessions(count: number): void {
    userSessions.set(count);
  }

  // Update queue sizes
  updateQueueSize(queueType: string, size: number): void {
    queueSize.set({ queue_type: queueType }, size);
  }

  // Get metrics registry
  getMetricsRegistry() {
    return register;
  }

  // Clear all metrics (useful for testing)
  clearMetrics(): void {
    register.clear();
    this.startTimes.clear();
  }

  // Get metrics as Prometheus format
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  // Health check for monitoring system
  isHealthy(): boolean {
    try {
      // Check if we can generate metrics
      register.metrics();
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Create singleton instance
export const monitoring = new MonitoringService();

// Helper function to create operation timer
export const createTimer = (operationId: string) => {
  monitoring.startTimer(operationId);
  return {
    end: (labels: any = {}) => monitoring.endTimer(operationId, labels)
  };
};

// Middleware function to automatically track HTTP metrics
export const metricsMiddleware = (req: any, res: any, next: any) => {
  const startTime = Date.now();
  const operationId = `http_${Date.now()}_${Math.random()}`;
  
  monitoring.startTimer(operationId);

  res.on('finish', () => {
    const duration = monitoring.endTimer(operationId, {
      operation: 'http',
      method: req.method,
      route: req.route?.path || req.url,
      status_code: res.statusCode
    });

    monitoring.trackHttpRequest(
      req.method,
      req.route?.path || req.url,
      res.statusCode,
      req.user?.id
    );
  });

  next();
};