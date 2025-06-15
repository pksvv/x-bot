# Twitter Thread Bot - Architecture & Data Flow

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Google Cloud Platform                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              App Engine (F1 Instance)               │   │
│  │                     1GB RAM / 0.25 vCPU             │   │
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
│  │  │                                             │   │   │
│  │  │  ┌──────────┐  ┌──────────┐                │   │   │
│  │  │  │Dashboard │  │  Simple  │                │   │   │
│  │  │  │(Next.js) │  │ Health   │                │   │   │
│  │  │  └──────────┘  └──────────┘                │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────┐   │
│                                                       │   │
│  ┌─────────────────┐    ┌─────────────────────────────┘   │
│  │  Load Balancer  │────┤                                 │
│  │   (Health Check)│    │                                 │
│  └─────────────────┘    │                                 │
│                         │                                 │
│  ┌─────────────────┐    │                                 │
│  │   GCP Native    │◄───┘                                 │
│  │   Monitoring    │                                      │
│  │   (Stackdriver) │                                      │
│  └─────────────────┘                                      │
└─────────────────────────────────────────────────────────────┘
                    │                    │                    │
                    ▼                    ▼                    ▼
         ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
         │   Twitter API   │  │Google Sheets API│  │     Users       │
         │     (v2)        │  │      (v4)       │  │  (Dashboard)    │
         └─────────────────┘  └─────────────────┘  └─────────────────┘
```

## 🔄 Multi-Account Data Flow

```
Multiple Users & Twitter Accounts:

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User A        │    │   User B        │    │   User C        │
│ @twitter_a      │    │ @twitter_b      │    │ @twitter_c      │
│ google_sheet_a  │    │ google_sheet_b  │    │ google_sheet_c  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Central API System                           │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Auth       │  │  Multi-User  │  │   Thread     │         │
│  │   System     │  │   Database   │  │   Scheduler  │         │
│  │              │  │              │  │              │         │
│  │ JWT Tokens   │  │ User Groups  │  │ Per-Account  │         │
│  │ Role-based   │  │ Twitter IDs  │  │ Publishing   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                    ┌─────────────────────┐
                    │   Twitter API       │
                    │   (Multiple Apps)   │
                    │                     │
                    │ App A → @twitter_a  │
                    │ App B → @twitter_b  │
                    │ App C → @twitter_c  │
                    └─────────────────────┘
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

### 2. Simplified Logging & Monitoring
```
Every Request
    │
    ▼
┌──────────────────┐
│ Winston Logger   │ ← Structured JSON logs + Correlation ID
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
         │ GCP Stackdriver  │ ← Console output → GCP Logging
         │ Logging          │
         └──────────────────┘
                     │
                     ▼
         ┌──────────────────┐
         │ GCP Native       │ ← Automatic metrics collection
         │ Monitoring       │   Memory, CPU, Requests, Errors
         └──────────────────┘
                     │
                     ▼
         ┌──────────────────┐
         │ Simple Health    │ ← /monitoring/health
         │ Endpoints        │   /monitoring/ping
         └──────────────────┘
```

## 📊 Data Models

### Core Entities
```typescript
Thread {
  id: string
  userId: string              // Links to specific user/twitter account
  twitterHandle: string       // @username for this thread
  content: string[]           // Array of tweet content
  status: 'draft' | 'scheduled' | 'published' | 'failed'
  scheduledTime?: Date
  publishedTime?: Date
  tweetIds?: string[]         // Twitter IDs after publishing
  metrics?: ThreadMetrics     // Performance data
  source: 'api' | 'sheets'    // Where thread originated
  sheetRowId?: string         // Google Sheets row reference
}

User {
  id: string
  username: string            // System username
  email: string
  twitterHandle: string       // @username on Twitter
  twitterAppKeys: {           // Unique Twitter app per user
    appKey: string
    appSecret: string
    accessToken: string
    accessSecret: string
  }
  googleSheetsId?: string     // Google Sheets integration
  role: 'admin' | 'user'
  isActive: boolean
}

ThreadMetrics {
  views: number
  likes: number
  retweets: number
  replies: number
  impressions: number
  engagementRate: number
  collectedAt: Date
}

UserSession {
  id: string
  userId: string
  token: string
  expiresAt: Date
}
```

## 📋 Google Sheets Integration

### Required Column Structure
```
| A: Thread ID | B: Status | C: Scheduled Time | D: Tweet 1 | E: Tweet 2 | F: Tweet 3 | ... | Z: Published URLs | AA: Metrics |
|--------------|-----------|-------------------|------------|------------|------------|-----|-------------------|-------------|
| thread_001   | draft     | 2024-01-15 09:00 | First tweet| Second...  | Third...   | ... | twitter.com/...   | Views: 1.2K |
| thread_002   | scheduled | 2024-01-15 14:00 | Another... | Tweet...   |            |     |                   |             |
```

### Multi-Account Sheets Structure
```
Sheet 1: @user_a_threads
Sheet 2: @user_b_threads  
Sheet 3: @user_c_threads

Each sheet has identical column structure but separate Twitter credentials
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