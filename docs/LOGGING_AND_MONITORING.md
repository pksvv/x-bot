# Logging and Monitoring

This document describes the comprehensive logging and monitoring system implemented in the Twitter Thread Bot.

## Overview

The application includes enterprise-grade logging and monitoring with:

- **Structured logging** with Winston
- **Prometheus metrics** for monitoring
- **Health checks** for system status
- **Performance monitoring** 
- **Security event logging**
- **Automated log rotation** and cleanup
- **Graceful error handling**

## Logging System

### Log Levels

- **Error** (0): Critical errors requiring immediate attention
- **Warn** (1): Warning conditions that should be investigated
- **Info** (2): General operational information
- **HTTP** (3): HTTP request/response logging
- **Debug** (4): Detailed debugging information

### Log Categories

- **Authentication**: User login, registration, API key usage
- **API**: HTTP requests, responses, and endpoint usage
- **Database**: Database operations and queries
- **Twitter**: Twitter API interactions and tweet publishing
- **Sheets**: Google Sheets integration operations
- **Scheduler**: Cron job execution and thread scheduling
- **Security**: Security events and suspicious activity
- **Performance**: Response times and resource usage
- **Health**: System health checks and component status

### Log Outputs

#### Console Output (Development)
- Colorized output with timestamps
- Real-time logging for development debugging
- Disabled in test environment

#### File Outputs (Production)
- **Combined logs**: `logs/combined-YYYY-MM-DD.log` (all levels)
- **Error logs**: `logs/error-YYYY-MM-DD.log` (errors only)
- **Access logs**: `logs/access-YYYY-MM-DD.log` (HTTP requests)
- **Exception logs**: `logs/exceptions-YYYY-MM-DD.log` (uncaught exceptions)
- **Rejection logs**: `logs/rejections-YYYY-MM-DD.log` (unhandled rejections)

#### Log Rotation
- Daily rotation with date stamps
- Automatic compression of old logs
- Configurable retention periods:
  - Combined logs: 30 days
  - Error logs: 14 days  
  - Access logs: 7 days
- Maximum file size: 20MB before rotation

## Monitoring System

### Metrics Collection

The application exposes Prometheus-compatible metrics:

#### HTTP Metrics
- `twitter_thread_bot_http_requests_total` - Total HTTP requests by method, route, status
- `twitter_thread_bot_http_request_duration_seconds` - Request duration histogram

#### Business Metrics
- `twitter_thread_bot_threads_total` - Total threads by status (created, published, failed)
- `twitter_thread_bot_tweets_published_total` - Total tweets published
- `twitter_thread_bot_metrics_collection_total` - Metrics collection operations

#### Authentication Metrics
- `twitter_thread_bot_auth_attempts_total` - Authentication attempts by type and status
- `twitter_thread_bot_user_sessions_active` - Active user sessions
- `twitter_thread_bot_active_users` - Active users in last 24 hours

#### System Metrics
- `twitter_thread_bot_database_operations_total` - Database operations by type
- `twitter_thread_bot_external_api_requests_total` - External API calls
- `twitter_thread_bot_scheduled_jobs_executed_total` - Cron job executions
- `twitter_thread_bot_errors_total` - Error counts by type and severity

#### Performance Metrics
- `twitter_thread_bot_database_operation_duration_seconds` - DB query times
- `twitter_thread_bot_external_api_response_time_seconds` - External API response times
- Default Node.js metrics (memory, CPU, event loop, etc.)

### Health Checks

Comprehensive health monitoring with status endpoints:

#### Components Monitored
- **Database**: Connection and query performance
- **Twitter API**: API accessibility and rate limits
- **Google Sheets API**: Connection and authentication
- **File System**: Read/write operations
- **Memory Usage**: Heap usage and system memory
- **Disk Space**: Available storage

#### Health Status Levels
- **Healthy**: All systems operating normally
- **Degraded**: Some systems slow or non-critical failures
- **Unhealthy**: Critical systems down or failing

## API Endpoints

### Public Endpoints

#### Health Check
```
GET /monitoring/health
```
Returns comprehensive system health status.

#### Simple Ping
```
GET /monitoring/ping
```
Basic liveness check for load balancers.

#### Prometheus Metrics
```
GET /monitoring/metrics
```
Prometheus-formatted metrics for scraping.

### Admin Endpoints (Authentication Required)

#### System Information
```
GET /monitoring/system
```
Detailed system information including OS, process, and application details.

#### Metrics Summary
```
GET /monitoring/metrics/summary
```
Parsed summary of key metrics.

#### Log Analytics
```
GET /monitoring/analytics/logs
```
Log analysis and patterns.

#### Performance Analytics
```
GET /monitoring/analytics/performance
```
Performance metrics and trends.

#### Security Analytics
```
GET /monitoring/analytics/security
```
Security events and authentication metrics.

#### Business Analytics
```
GET /monitoring/analytics/business
```
Business-specific metrics (threads, tweets, users).

## Automated Jobs

### Health Monitoring Job
- **Frequency**: Every 5 minutes
- **Purpose**: Continuous health checking
- **Actions**: Log health status, alert on failures

### Metrics Collection Job
- **Frequency**: Every minute
- **Purpose**: Update real-time metrics
- **Actions**: Count active users/sessions, update gauges

### Log Cleanup Job
- **Frequency**: Daily at 2:00 AM
- **Purpose**: Maintain log storage
- **Actions**: Delete old logs, compress archives

### Database Cleanup Job
- **Frequency**: Daily at 3:00 AM
- **Purpose**: Database maintenance
- **Actions**: Clean expired sessions, vacuum database

### Performance Monitoring Job
- **Frequency**: Every 15 minutes
- **Purpose**: Monitor system performance
- **Actions**: Check memory/CPU usage, alert on issues

### Security Monitoring Job
- **Frequency**: Every 10 minutes
- **Purpose**: Security event analysis
- **Actions**: Detect suspicious patterns, alert on threats

## Configuration

### Environment Variables

```env
# Logging Configuration
LOG_LEVEL=info                    # Minimum log level
LOG_DIR=./logs                    # Log file directory
LOG_MAX_SIZE=20m                  # Max file size before rotation
LOG_MAX_FILES=30d                 # Log retention period

# Monitoring Configuration
METRICS_ENABLED=true              # Enable Prometheus metrics
HEALTH_CHECK_INTERVAL=300000      # Health check interval (ms)
MONITORING_USERNAME=admin         # Basic auth for monitoring endpoints
MONITORING_PASSWORD=secret        # Basic auth password
```

### Security Considerations

- **Log Sanitization**: Sensitive data (passwords, tokens) automatically redacted
- **Access Control**: Monitoring endpoints require admin authentication
- **Rate Limiting**: Monitoring endpoints have separate rate limits
- **Audit Trail**: All admin access to monitoring endpoints logged

## Integration Examples

### Prometheus Configuration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'twitter-thread-bot'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/monitoring/metrics'
    scrape_interval: 30s
```

### Grafana Dashboard

Key metrics to monitor:
- Request rate and response times
- Error rates by endpoint
- Active users and sessions
- Database performance
- Thread publishing success rate
- External API response times

### Alerting Rules

Recommended alerts:
- High error rate (>5% in 5 minutes)
- Slow response times (>2s average)
- Database connection failures
- High memory usage (>90%)
- Failed health checks
- Security events (failed auth attempts)

## Log Analysis

### Structured Log Format

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "Thread published successfully",
  "threadId": "thread-123",
  "userId": "user-456", 
  "tweetCount": 3,
  "category": "thread",
  "action": "published"
}
```

### Common Log Queries

#### Failed Authentication Attempts
```bash
grep "Authentication failed" logs/combined-*.log | grep -v "test"
```

#### Slow Requests
```bash
grep "Slow request" logs/combined-*.log | tail -20
```

#### Error Summary
```bash
grep '"level":"error"' logs/combined-*.log | jq -r '.message' | sort | uniq -c
```

## Troubleshooting

### Common Issues

1. **Logs Not Writing**
   - Check file permissions on logs directory
   - Verify LOG_DIR environment variable
   - Check disk space

2. **Metrics Not Available**
   - Verify Prometheus client is running
   - Check /monitoring/metrics endpoint
   - Review error logs for metric collection failures

3. **High Memory Usage**
   - Monitor heap usage in metrics
   - Check for memory leaks in error logs
   - Review performance monitoring alerts

4. **Database Performance Issues**
   - Monitor database operation duration metrics
   - Check database health status
   - Review slow query logs

### Debugging Commands

```bash
# Check log files
ls -la logs/

# Monitor real-time logs
tail -f logs/combined-$(date +%Y-%m-%d).log

# Check system health
curl http://localhost:3000/monitoring/health

# Get metrics
curl http://localhost:3000/monitoring/metrics

# Check process status
ps aux | grep node
```

This comprehensive logging and monitoring system provides full visibility into the Twitter Thread Bot's operation, performance, and security, enabling proactive maintenance and rapid issue resolution.