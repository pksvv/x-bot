# Logging & Monitoring Guide

## 🎯 Overview

This Twitter Thread Bot uses a simplified, GCP-native monitoring approach optimized for free-tier deployment. No complex metrics collection - just essential logging and health checks.

## 📝 Logging Architecture

### Development Environment
```
Local Development:
├── Console Output (colored, detailed)
├── File Logging (./logs/)
│   ├── combined-YYYY-MM-DD.log (all levels)
│   ├── error-YYYY-MM-DD.log (errors only)
│   ├── exceptions-YYYY-MM-DD.log (uncaught exceptions)
│   └── rejections-YYYY-MM-DD.log (unhandled rejections)
└── Correlation ID tracking for request tracing
```

### Production Environment (GCP)
```
Production Deployment:
├── Console Output → GCP Stackdriver Logging (automatic)
├── No File Logging (saves memory and disk space)
├── Correlation ID in all requests
└── GCP Native Monitoring (automatic metrics)
```

## 🔍 Log Levels & Usage

### Log Levels (Ordered by Priority)
```typescript
error: 0    // System errors, exceptions, failed operations
warn: 1     // Warnings, security events, rate limits
info: 2     // General application flow, successful operations  
http: 3     // HTTP request/response logging
debug: 4    // Detailed debugging information (dev only)
```

### Structured Log Format
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "Thread published successfully",
  "correlationId": "uuid-v4-string",
  "userId": "user_123",
  "threadId": "thread_456",
  "twitterHandle": "@username",
  "category": "thread_management"
}
```

## 🔄 Correlation ID Tracing

Every request gets a unique correlation ID for end-to-end tracing:

### Request Headers
```http
GET /api/threads
x-correlation-id: 550e8400-e29b-41d4-a716-446655440000
```

### Response Headers
```http
HTTP/1.1 200 OK
x-correlation-id: 550e8400-e29b-41d4-a716-446655440000
```

### Log Entries
```json
{
  "correlationId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Thread creation started",
  "level": "info"
}
```

## 📊 GCP Native Monitoring

### Automatic Metrics (No Configuration Required)
- **Request Count**: HTTP requests per minute
- **Response Time**: Average request duration
- **Error Rate**: 4xx/5xx response percentage
- **Memory Usage**: Heap usage and RSS
- **CPU Usage**: Instance CPU utilization
- **Instance Health**: App Engine health metrics

### Health Check Endpoints

#### 1. Load Balancer Health Check
```
GET /monitoring/health
```
**Response (Healthy):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "uptime": 3600000,
    "checks": [
      {
        "name": "database",
        "status": "healthy",
        "responseTime": 15,
        "message": "Database connection successful"
      },
      {
        "name": "memory",
        "status": "healthy",
        "responseTime": 85,
        "message": "Memory usage normal"
      }
    ],
    "version": "1.0.0",
    "environment": "production"
  }
}
```

#### 2. Simple Ping Check
```
GET /monitoring/ping
```
**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600
}
```

## 🛠️ Monitoring Operations

### Viewing Logs in GCP Console

1. **Access Logs:**
   - Go to GCP Console → Logging → Logs Explorer
   - Filter by: `resource.type="gae_app"`

2. **Common Log Queries:**
   ```
   # View all errors
   severity="ERROR"
   
   # Track specific request
   jsonPayload.correlationId="550e8400-e29b-41d4-a716-446655440000"
   
   # Monitor thread operations
   jsonPayload.category="thread_management"
   
   # Security events
   jsonPayload.category="security"
   ```

### Command Line Monitoring
```bash
# View real-time logs
npm run gcp:logs

# Equivalent gcloud command
gcloud app logs tail -s default

# View specific time range
gcloud app logs read --since=1h

# View logs with specific severity
gcloud app logs read --severity=ERROR
```

### GCP Monitoring Dashboard

Access built-in metrics at:
- GCP Console → Monitoring → Dashboards
- App Engine → Services → [your-service] → Metrics

**Key Metrics to Monitor:**
- Request count and latency
- Error rate (should be < 1%)
- Memory usage (should be < 80% of 1GB)
- Instance count (should scale to 0 when idle)

## 🚨 Error Handling & Alerting

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Thread content cannot be empty",
    "timestamp": "2024-01-15T10:30:00.000Z"
  },
  "correlationId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Error Categories
```typescript
// Client Errors (4xx)
VALIDATION_ERROR     // Invalid input data
NOT_FOUND           // Resource doesn't exist  
AUTH_ERROR          // Authentication failed
RATE_LIMIT_ERROR    // Too many requests

// Server Errors (5xx)  
INTERNAL_ERROR      // General server error
DATABASE_ERROR      // Database operation failed
EXTERNAL_API_ERROR  // Twitter/Sheets API error
```

### Error Logging Examples
```javascript
// Automatic error context
logger.logError(error, 'Thread publication failed', {
  threadId: 'thread_123',
  userId: 'user_456',
  correlationId: req.correlationId
});

// Security event logging
logger.logSecurity('Failed login attempt', userId, req.ip, {
  reason: 'Invalid password',
  userAgent: req.headers['user-agent']
});
```

## 📈 Performance Monitoring

### Response Time Tracking
```javascript
// Automatic slow request logging (>1000ms)
logger.logPerformance('Slow request', responseTime, {
  method: 'POST',
  url: '/api/threads',
  statusCode: 200,
  userId: 'user_123'
});
```

### Memory Usage Monitoring
- **Healthy**: < 80% of 1GB (< 800MB)
- **Warning**: 80-90% (800-900MB)
- **Critical**: > 90% (> 900MB)

## 🔧 Troubleshooting Guide

### Common Issues & Solutions

#### 1. High Memory Usage
```bash
# Check memory logs
gcloud app logs read --filter="memory" --since=1h

# Scale down to reduce load
gcloud app versions stop [VERSION]
```

#### 2. Database Connection Issues
```bash
# Check database health
curl https://your-app.appspot.com/monitoring/health

# Check database logs
gcloud app logs read --filter="database" --since=1h
```

#### 3. Twitter API Rate Limits
```bash
# Check rate limit logs
gcloud app logs read --filter="rate_limit" --since=1h

# Monitor external API calls
gcloud app logs read --filter="twitter" --since=1h
```

#### 4. Request Tracing
```bash
# Find all logs for a specific request
gcloud app logs read --filter="correlationId=550e8400-e29b-41d4-a716-446655440000"

# Track user activity
gcloud app logs read --filter="userId=user_123" --since=1h
```

## 📋 Log Categories

### Business Logic Categories
- `thread_management`: Thread creation, publishing, scheduling
- `metrics_collection`: Performance data gathering
- `sheets_sync`: Google Sheets integration
- `scheduler`: Automated job execution

### System Categories  
- `authentication`: Login, logout, token validation
- `api`: HTTP request/response logging
- `database`: SQLite operations
- `external_api`: Twitter/Google Sheets API calls
- `security`: Security events, rate limiting
- `health`: System health checks
- `performance`: Slow operations, resource usage

## 🎯 Best Practices

### Development
1. Use correlation IDs for request tracing
2. Log at appropriate levels (don't spam with debug logs)
3. Include relevant context in log messages
4. Test error scenarios and logging

### Production
1. Monitor GCP Console regularly
2. Set up log-based alerting for critical errors
3. Use correlation IDs to track issues
4. Keep logs under 1GB total storage (free tier limit)

### Security
1. Never log sensitive data (passwords, tokens, API keys)
2. Use `[REDACTED]` for sensitive fields
3. Monitor failed authentication attempts
4. Track suspicious activity patterns

## 📚 Additional Resources

- [GCP Logging Documentation](https://cloud.google.com/logging/docs)
- [App Engine Monitoring](https://cloud.google.com/appengine/docs/standard/monitoring)
- [Winston.js Documentation](https://github.com/winstonjs/winston)
- [Correlation ID Best Practices](https://blog.rapid7.com/2016/12/23/the-value-of-correlation-ids/)