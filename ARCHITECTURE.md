# Twitter Thread Bot - Architecture & Data Flow

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Google Cloud Platform                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              App Engine (F1 Instance)               │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │           Twitter Thread Bot API            │   │   │
│  │  │                                             │   │   │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │   │   │
│  │  │  │   Auth   │  │ Threads  │  │  Sheets  │  │   │   │
│  │  │  │   API    │  │   API    │  │   API    │  │   │   │
│  │  │  └──────────┘  └──────────┘  └──────────┘  │   │   │
│  │  │                                             │   │   │
│  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │   │   │
│  │  │  │ Logging  │  │   DB     │  │Scheduler │  │   │   │
│  │  │  │(Winston) │  │(SQLite)  │  │ (Cron)   │  │   │   │
│  │  │  └──────────┘  └──────────┘  └──────────┘  │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────┐   │
│                                                       │   │
│  ┌─────────────────┐    ┌─────────────────────────────┘   │
│  │  Load Balancer  │────┤                                 │
│  │   (Health Check)│    │                                 │
│  └─────────────────┘    │                                 │
│                         │                                 │
│  ┌─────────────────┐    │                                 │
│  │   GCP Logging   │◄───┘                                 │
│  │   & Monitoring  │                                      │
│  └─────────────────┘                                      │
└─────────────────────────────────────────────────────────────┘
                    │                    │
                    ▼                    ▼
         ┌─────────────────┐  ┌─────────────────┐
         │   Twitter API   │  │Google Sheets API│
         │     (v2)        │  │      (v4)       │
         └─────────────────┘  └─────────────────┘
```

## 🔄 Request Flow

### 1. HTTP Request Processing
```
Client Request
    │
    ▼
┌──────────────────┐
│ Load Balancer    │ ← Health checks /monitoring/health
│ (GCP)           │
└──────────────────┘
    │
    ▼
┌──────────────────┐
│ Express App      │
└──────────────────┘
    │
    ▼
┌──────────────────┐
│ Correlation ID   │ ← Adds x-correlation-id header
│ Middleware       │
└──────────────────┘
    │
    ▼
┌──────────────────┐
│ Request Logger   │ ← Logs with correlation ID
│ (Winston)        │
└──────────────────┘
    │
    ▼
┌──────────────────┐
│ Rate Limiting    │ ← API rate limits
└──────────────────┘
    │
    ▼
┌──────────────────┐
│ Authentication   │ ← JWT token validation
│ Middleware       │
└──────────────────┘
    │
    ▼
┌──────────────────┐
│ API Route        │ ← /api/threads, /api/auth, etc.
│ Handler          │
└──────────────────┘
    │
    ▼
┌──────────────────┐
│ Business Logic   │ ← Controllers & Services
└──────────────────┘
    │
    ▼
┌──────────────────┐
│ Error Handler    │ ← Centralized error responses
│ Middleware       │
└──────────────────┘
    │
    ▼
┌──────────────────┐
│ Response with    │ ← Includes correlation ID
│ Correlation ID   │
└──────────────────┘
```

### 2. Thread Publication Flow
```
POST /api/threads
    │
    ▼
┌──────────────────┐
│ Validate Thread  │
│ Content          │
└──────────────────┘
    │
    ▼
┌──────────────────┐
│ Save to SQLite   │ ← Store draft
│ Database         │
└──────────────────┘
    │
    ▼
┌──────────────────┐
│ Schedule/Publish │
│ Decision         │
└──────────────────┘
    │
    ├─ Immediate ────┐
    │                ▼
    │    ┌──────────────────┐
    │    │ Publish to       │
    │    │ Twitter API      │
    │    └──────────────────┘
    │                │
    └─ Scheduled ───┐│
                    ▼▼
         ┌──────────────────┐
         │ Cron Scheduler   │ ← Background job
         │ (node-cron)      │
         └──────────────────┘
                    │
                    ▼
         ┌──────────────────┐
         │ Sync to Google   │ ← Optional sheets sync
         │ Sheets           │
         └──────────────────┘
```

## 🔍 Monitoring & Logging Flow

### 1. Health Monitoring
```
GCP Load Balancer
    │
    ▼ (every 30s)
┌──────────────────┐
│ GET /monitoring/ │
│ health           │
└──────────────────┘
    │
    ▼
┌──────────────────┐
│ Health Service   │ ← Checks DB, APIs, memory
└──────────────────┘
    │
    ▼
┌──────────────────┐
│ Return Health    │ ← 200/503 response
│ Status JSON      │
└──────────────────┘
```

### 2. Logging & Metrics
```
Every Request
    │
    ▼
┌──────────────────┐
│ Winston Logger   │ ← Structured JSON logs
└──────────────────┘
    │
    ├─ Development ──┐
    │                ▼
    │    ┌──────────────────┐
    │    │ Local Log Files  │
    │    │ (./logs/)        │
    │    └──────────────────┘
    │
    └─ Production ───┐
                     ▼
         ┌──────────────────┐
         │ GCP Logging      │ ← Console output → GCP
         │ (Stackdriver)    │
         └──────────────────┘
                     │
                     ▼
         ┌──────────────────┐
         │ Prometheus       │ ← /monitoring/metrics
         │ Metrics          │
         └──────────────────┘
```

## 📊 Data Models

### Core Entities
```typescript
Thread {
  id: string
  content: string[]
  status: 'draft' | 'scheduled' | 'published' | 'failed'
  scheduledTime?: Date
  publishedTime?: Date
  tweetIds?: string[]
  metrics?: ThreadMetrics
}

User {
  id: string
  username: string
  role: 'admin' | 'user'
  isActive: boolean
}

UserSession {
  id: string
  userId: string
  token: string
  expiresAt: Date
}
```

## 🛡️ Security Flow
```
API Request
    │
    ▼
┌──────────────────┐
│ HTTPS (GCP TLS)  │ ← SSL termination
└──────────────────┘
    │
    ▼
┌──────────────────┐
│ Helmet.js        │ ← Security headers
│ Middleware       │
└──────────────────┘
    │
    ▼
┌──────────────────┐
│ CORS             │ ← Cross-origin policy
└──────────────────┘
    │
    ▼
┌──────────────────┐
│ Rate Limiting    │ ← Express rate limit
└──────────────────┘
    │
    ▼
┌──────────────────┐
│ JWT Auth         │ ← Token validation
└──────────────────┘
    │
    ▼
┌──────────────────┐
│ Role-based       │ ← Admin/user permissions
│ Access Control   │
└──────────────────┘
```

## 💾 Persistence
- **SQLite Database**: Threads, users, sessions
- **File System**: Logs (development only)
- **GCP Persistent Disk**: Database persistence
- **Memory**: Session data, cache (minimal for free tier)

## 🔄 Background Jobs
- **Thread Scheduler**: Publishes scheduled threads
- **Metrics Collection**: Gathers Twitter engagement
- **Sheets Sync**: Updates Google Sheets (optional)
- **Health Monitoring**: System health checks