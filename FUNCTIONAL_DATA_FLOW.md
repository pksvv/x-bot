# Functional Data Flow - Complete User Journey

## 🎯 Overview

This document describes the complete end-to-end user journey from Google Sheets entry to performance monitoring, including multi-account Twitter management.

## 👥 Multi-Account Setup Architecture

### Account Isolation Strategy
```
Each Twitter Account = Separate User Entity
├── Unique Twitter App Registration (required by Twitter)
├── Individual Google Sheets (optional, can share)
├── Isolated API credentials
├── Separate authentication tokens
└── Independent scheduling and metrics
```

### User Account Structure
```typescript
User Account {
  systemUsername: "john_doe"           // Internal system identifier
  email: "john@example.com"           // Login email
  twitterHandle: "@john_marketing"     // Twitter username
  twitterApp: {                       // Unique Twitter app per account
    appKey: "xxx",
    appSecret: "xxx", 
    accessToken: "xxx",
    accessSecret: "xxx"
  },
  googleSheetsId: "1ABC123XYZ...",    // Optional: Google Sheets integration
  role: "user",                       // user | admin
  isActive: true
}
```

## 📊 Google Sheets Structure

### Required Column Layout
```
| A        | B         | C              | D        | E        | F        | G        | H        | ... | Y              | Z            | AA        |
|----------|-----------|----------------|----------|----------|----------|----------|----------|-----|----------------|--------------|-----------|
| ThreadID | Status    | ScheduledTime  | Tweet1   | Tweet2   | Tweet3   | Tweet4   | Tweet5   | ... | PublishedURLs  | Metrics      | Notes     |
|----------|-----------|----------------|----------|----------|----------|----------|----------|-----|----------------|--------------|-----------|
| T001     | draft     | 2024-01-15 9AM | First... | Second...| Third... |          |          |     |                |              | Draft     |
| T002     | scheduled | 2024-01-15 2PM | Market...| Data...  | Insight..| Trends...| Summary..|     |                |              | Campaign  |
| T003     | published |                | Launch...| Feature..| Demo...  |          |          |     | twitter.com/.. | 1.2K views  | Success   |
```

### Column Definitions
- **A (ThreadID)**: Unique identifier (auto-generated or manual)
- **B (Status)**: `draft`, `scheduled`, `published`, `failed`
- **C (ScheduledTime)**: Format: `YYYY-MM-DD HH:MM` or `MM/DD/YYYY H:MM AM/PM`
- **D-X (Tweets)**: Tweet content (max 280 chars each, auto-truncated)
- **Y (PublishedURLs)**: Auto-populated after publishing
- **Z (Metrics)**: Auto-updated with performance data
- **AA (Notes)**: User notes, campaign info, etc.

### Multi-Account Sheets Options

#### Option 1: Separate Sheets per Account
```
Google Drive Structure:
├── "@john_marketing_threads" (Sheet)
├── "@company_news_threads" (Sheet)
├── "@product_updates_threads" (Sheet)
└── "shared_campaigns" (Sheet) - multiple users
```

#### Option 2: Single Sheet with Account Column
```
| A        | B          | C         | D              | E        | F        |
|----------|------------|-----------|----------------|----------|----------|
| Account  | ThreadID   | Status    | ScheduledTime  | Tweet1   | Tweet2   |
|----------|------------|-----------|----------------|----------|----------|
| @john    | T001       | draft     | 2024-01-15 9AM | First... | Second...|
| @company | T002       | scheduled | 2024-01-15 2PM | News...  | Update...|
```

## 🔄 Complete Data Flow Journey

### Phase 1: User Entry in Google Sheets
```
User Action: Enters thread data in Google Sheets
    │
    ▼
┌─────────────────────────────────────────┐
│ Google Sheets (User Input)              │
│                                         │
│ Row Data:                               │
│ ├── ThreadID: "T001"                    │
│ ├── Status: "draft"                     │
│ ├── ScheduledTime: "2024-01-15 2:00 PM" │
│ ├── Tweet1: "Excited to announce..."    │
│ ├── Tweet2: "Here's what you need..."   │
│ └── Tweet3: "Learn more at..."          │
└─────────────────────────────────────────┘
    │
    ▼ (Auto-sync every 5 minutes)
┌─────────────────────────────────────────┐
│ Sheets Sync Service                     │
│ ├── Validates row data                  │
│ ├── Maps to Thread entity               │
│ ├── Checks for user permissions         │
│ └── Creates/updates database record     │
└─────────────────────────────────────────┘
```

### Phase 2: Data Processing & Validation
```
┌─────────────────────────────────────────┐
│ Thread Processing Pipeline              │
│                                         │
│ Input Validation:                       │
│ ├── Check tweet length (280 chars)      │
│ ├── Validate scheduled time format      │
│ ├── Verify user permissions             │
│ └── Sanitize content                    │
│                                         │
│ Database Storage:                       │
│ ├── Create Thread record                │
│ ├── Link to User account                │
│ ├── Set source: "sheets"                │
│ └── Store sheetRowId reference          │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ SQLite Database                         │
│                                         │
│ threads table:                          │
│ ├── id: "thread_uuid"                   │
│ ├── userId: "user_123"                  │
│ ├── twitterHandle: "@john_marketing"    │
│ ├── content: ["Tweet 1", "Tweet 2"]     │
│ ├── status: "draft"                     │
│ ├── scheduledTime: "2024-01-15T14:00Z"  │
│ ├── source: "sheets"                    │
│ └── sheetRowId: "Sheet1!A2"             │
└─────────────────────────────────────────┘
```

### Phase 3: Dashboard Management
```
User Access: https://your-app.appspot.com/dashboard
    │
    ▼
┌─────────────────────────────────────────┐
│ Next.js Dashboard                       │
│                                         │
│ Authentication:                         │
│ ├── JWT token validation                │
│ ├── Load user profile                   │
│ └── Filter threads by user              │
│                                         │
│ Dashboard Views:                        │
│ ├── My Threads (filtered by @handle)    │
│ ├── Draft Threads                       │
│ ├── Scheduled Threads                   │
│ ├── Published Threads                   │
│ └── Performance Analytics               │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ Thread Management Actions               │
│                                         │
│ Available Actions:                      │
│ ├── Edit thread content                 │
│ ├── Change scheduled time               │
│ ├── Publish immediately                 │
│ ├── Cancel scheduled thread             │
│ ├── Duplicate thread                    │
│ └── Delete thread                       │
│                                         │
│ Bidirectional Sync:                     │
│ ├── Changes sync back to Google Sheets  │
│ ├── Status updates in real-time         │
│ └── URL updates after publishing        │
└─────────────────────────────────────────┘
```

### Phase 4: Scheduling & Publishing
```
Cron Scheduler: Runs every minute
    │
    ▼
┌─────────────────────────────────────────┐
│ Thread Scheduler Service                │
│                                         │
│ Process:                                │
│ ├── Query scheduled threads             │
│ ├── Check if scheduledTime <= now       │
│ ├── Filter by user/twitter account      │
│ └── Process each thread                 │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ Twitter Publishing Pipeline             │
│                                         │
│ For each thread:                        │
│ ├── Load user's Twitter credentials     │
│ ├── Initialize Twitter API client       │
│ ├── Publish first tweet                 │
│ ├── Reply with subsequent tweets        │
│ ├── Collect tweet IDs                   │
│ └── Update thread status                │
│                                         │
│ Error Handling:                         │
│ ├── Rate limit detection                │
│ ├── API error recovery                  │
│ ├── Partial publish scenarios           │
│ └── Status rollback                     │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ Post-Publishing Updates                 │
│                                         │
│ Database Updates:                       │
│ ├── status: "published"                 │
│ ├── publishedTime: timestamp            │
│ ├── tweetIds: ["123", "456", "789"]     │
│ └── Generate thread URLs                │
│                                         │
│ Google Sheets Sync:                     │
│ ├── Update status column                │
│ ├── Add published URLs                  │
│ ├── Clear scheduled time                │
│ └── Add publish timestamp               │
└─────────────────────────────────────────┘
```

### Phase 5: Metrics Collection
```
Metrics Scheduler: Runs every 2 hours
    │
    ▼
┌─────────────────────────────────────────┐
│ Metrics Collection Service              │
│                                         │
│ Process:                                │
│ ├── Query published threads             │
│ ├── Filter threads from last 30 days    │
│ ├── Group by user/Twitter account       │
│ └── Collect metrics per account         │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ Twitter API Metrics Gathering           │
│                                         │
│ For each tweet:                         │
│ ├── Load user's Twitter credentials     │
│ ├── Call Twitter API for tweet metrics  │
│ ├── Extract: views, likes, retweets     │
│ ├── Calculate engagement rate           │
│ └── Store metrics with timestamp        │
│                                         │
│ Aggregation:                            │
│ ├── Thread-level metrics                │
│ ├── User-level performance              │
│ ├── Time-based trends                   │
│ └── Comparative analysis                │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ Metrics Storage & Sync                  │
│                                         │
│ Database Updates:                       │
│ ├── Store in thread_metrics table       │
│ ├── Link to specific thread             │
│ ├── Timestamp collection                │
│ └── Calculate derived metrics           │
│                                         │
│ Google Sheets Updates:                  │
│ ├── Update metrics column               │
│ ├── Format: "1.2K views, 45 likes"      │
│ ├── Include engagement rate             │
│ └── Add collection timestamp            │
└─────────────────────────────────────────┘
```

### Phase 6: Performance Monitoring & Analytics
```
Dashboard Analytics View
    │
    ▼
┌─────────────────────────────────────────┐
│ Performance Dashboard                   │
│                                         │
│ Key Metrics Displayed:                  │
│ ├── Total threads published             │
│ ├── Average engagement rate             │
│ ├── Best performing threads             │
│ ├── Posting frequency                   │
│ ├── Growth trends                       │
│ └── Comparative performance             │
│                                         │
│ Visualizations:                         │
│ ├── Time series charts                  │
│ ├── Engagement rate graphs              │
│ ├── Performance heatmaps                │
│ └── Top content analysis                │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ Multi-Account Analytics                 │
│                                         │
│ Admin Dashboard (if admin role):        │
│ ├── Cross-account performance           │
│ ├── System-wide metrics                 │
│ ├── User activity summary               │
│ └── Resource utilization                │
│                                         │
│ User Dashboard:                         │
│ ├── Personal account metrics only       │
│ ├── Historical performance              │
│ ├── Content optimization insights       │
│ └── Scheduling recommendations          │
└─────────────────────────────────────────┘
```

## 🔐 Multi-Account Security & Isolation

### Data Isolation Strategy
```
User A (@marketing_team):
├── Can only see threads with userId = A
├── Uses Twitter App A credentials
├── Accesses Google Sheets A
└── Dashboard shows only Account A data

User B (@product_updates):  
├── Can only see threads with userId = B
├── Uses Twitter App B credentials
├── Accesses Google Sheets B
└── Dashboard shows only Account B data

Admin User:
├── Can see all threads (with filters)
├── System-wide monitoring access
├── User management capabilities
└── Cross-account analytics
```

### API Security Flow
```
Request Authentication:
├── JWT token contains userId
├── Database queries filtered by userId
├── Twitter credentials loaded per user
├── Google Sheets access per user
└── Dashboard data filtered by user
```

## 🛠️ Operational Workflows

### Daily Operations
1. **Content Creation**: Users enter threads in Google Sheets
2. **Auto-Sync**: System syncs every 5 minutes
3. **Dashboard Review**: Users review/edit via web interface
4. **Auto-Publishing**: Scheduled threads publish automatically
5. **Metrics Collection**: Performance data collected every 2 hours
6. **Analytics Review**: Users monitor performance in dashboard

### Multi-Account Management
1. **Account Setup**: Each Twitter account needs unique app registration
2. **User Registration**: Admin creates user accounts with Twitter credentials
3. **Google Sheets**: Each user can optionally connect their sheets
4. **Publishing**: Automated per-account publishing
5. **Analytics**: Isolated performance tracking per account

### Error Handling & Recovery
1. **Failed Publishing**: Status remains "scheduled", retry on next cycle
2. **API Rate Limits**: Automatic backoff and retry logic
3. **Sheets Sync Failures**: Log errors, continue with manual dashboard
4. **Metrics Collection Failures**: Skip this cycle, retry next time
5. **Authentication Issues**: User notification via dashboard

This comprehensive data flow ensures seamless multi-account operation while maintaining security, performance, and ease of use.