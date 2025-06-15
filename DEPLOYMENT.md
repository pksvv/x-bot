# Twitter Thread Bot - GCP Deployment Guide

## 🚀 Quick Deployment to Google Cloud Platform (Free Tier)

### Prerequisites
- Google Cloud SDK installed (`gcloud`)
- GCP project with billing enabled
- App Engine API enabled

### One-Time Setup
```bash
# 1. Login to GCP
gcloud auth login

# 2. Set your project
gcloud config set project YOUR_PROJECT_ID

# 3. Create App Engine app (only once)
npm run gcp:setup
```

### Deploy
```bash
# Build and deploy
npm run gcp:deploy

# View your app
npm run gcp:browse

# View logs
npm run gcp:logs
```

## 📊 Monitoring & Health Checks

### Health Endpoints
- **Health Check**: `/monitoring/health` - Used by GCP load balancer
- **Ping**: `/monitoring/ping` - Simple liveness check  
- **Metrics**: `/monitoring/metrics` - Prometheus metrics

### Key Monitoring URLs
After deployment, check these endpoints:
- `https://YOUR_APP.appspot.com/monitoring/health`
- `https://YOUR_APP.appspot.com/monitoring/metrics`

## 🔍 Debugging

### Correlation IDs
Every request gets a correlation ID in the `x-correlation-id` header for tracing.

### Logs
- **Production**: View in GCP Console or `npm run gcp:logs`
- **Development**: Local files in `./logs/`

### Error Responses
All errors include:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "timestamp": "2024-01-01T00:00:00.000Z"
  },
  "correlationId": "uuid-for-tracing"
}
```

## 🔧 Configuration

### Environment Variables (set in GCP Console)
- `NODE_ENV=production` (automatic)
- `PORT=8080` (automatic)
- Add your API keys and secrets via GCP Console > App Engine > Settings > Environment Variables

### Memory Optimization for Free Tier
- File logging disabled in production (uses GCP logging)
- Minimal log retention
- Console-only exception handling

## 📈 Scaling

### Free Tier Limits
- 1 F1 instance (0.25 vCPU, 1GB RAM)
- Automatic scaling: 0-1 instances
- 28 instance hours/day free

### Cost Control
- Configured for minimal resource usage
- Auto-scales to 0 when not in use
- Optimized for GCP free tier

## 🛠️ Operations

### Common Commands
```bash
# Deploy
npm run gcp:deploy

# View logs
npm run gcp:logs

# Open app
npm run gcp:browse

# Local development
npm run dev

# Build and test
npm run build
npm test
```

### Troubleshooting
1. Check health endpoint first
2. View logs: `npm run gcp:logs`
3. Use correlation ID from error responses
4. Monitor memory usage in GCP Console

### Database
- SQLite database persists in App Engine
- Automatic backups via GCP
- No additional configuration needed for free tier