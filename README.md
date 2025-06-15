# Twitter Thread Bot

**Created by Vipul Gaur** - A comprehensive Twitter thread automation platform with multi-account support, analytics dashboard, Google Sheets integration, and production-ready deployment on Google Cloud Platform.

## 🎯 Overview

A production-ready Twitter thread automation bot designed for **multiple Twitter accounts**, with seamless Google Sheets integration, real-time analytics, and automated scheduling. Optimized for Google Cloud Platform free tier deployment.

## ✨ Key Features

### 🐦 **Multi-Account Twitter Management**
- Support for unlimited Twitter accounts
- Individual Twitter app credentials per account
- Isolated thread management and analytics
- Role-based access control

### 📊 **Advanced Analytics Dashboard**
- Real-time performance metrics
- Engagement rate tracking
- Historical trend analysis
- Cross-account performance comparison (admin)
- Interactive charts and visualizations

### 📋 **Google Sheets Integration**
- Bidirectional sync with Google Sheets
- Manage threads directly in spreadsheets
- Automatic metrics updates
- Multi-account sheet support

### ⏰ **Intelligent Scheduling**
- Cron-based automated publishing
- Per-account scheduling isolation
- Time zone support
- Retry logic for failed posts

### 🔒 **Enterprise Security**
- JWT token authentication
- API key management
- Role-based permissions
- Request correlation tracking
- Rate limiting protection

### ☁️ **Production Deployment Ready**
- Google Cloud Platform optimized
- Free tier friendly (F1 instance)
- Auto-scaling configuration
- Health check endpoints
- Simplified monitoring

## 🚀 Quick Start

### Prerequisites
- Node.js 18.0.0+
- Twitter Developer Account(s) - **One per Twitter account you want to manage**
- Google Cloud Project (for deployment)
- Google Sheets API access (optional)

### 1. Installation
```bash
git clone https://github.com/yourusername/twitter-thread-bot
cd twitter-thread-bot
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Server Configuration
NODE_ENV=development
PORT=3000

# Default Twitter Account (User 1)
TWITTER_API_KEY=your_twitter_app_1_api_key
TWITTER_API_SECRET=your_twitter_app_1_api_secret
TWITTER_ACCESS_TOKEN=your_twitter_app_1_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_twitter_app_1_access_token_secret

# Google Sheets Integration (Optional)
GOOGLE_SHEETS_CLIENT_EMAIL=your_service_account@project.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id

# Security
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
```

### 3. First Run Setup
```bash
# Build the application
npm run build

# Start the server
npm run dev

# Create your admin account (in another terminal)
node setup-auth.js

# Start the dashboard
npm run dashboard
```

Access your application:
- **API**: http://localhost:3000
- **Dashboard**: http://localhost:3001

## 🏗️ Multi-Account Architecture

### Account Structure
Each Twitter account requires:
1. **Separate Twitter Developer App** (Twitter requirement)
2. **Unique user account** in the system
3. **Individual credentials** stored securely
4. **Optional Google Sheets** integration

### Setup Multiple Accounts
```bash
# 1. Create user accounts via API or dashboard
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "marketing_team",
    "email": "marketing@company.com", 
    "password": "secure_password",
    "twitterHandle": "@company_marketing",
    "twitterAppKeys": {
      "appKey": "twitter_app_2_key",
      "appSecret": "twitter_app_2_secret",
      "accessToken": "twitter_app_2_access_token",
      "accessSecret": "twitter_app_2_access_secret"
    }
  }'

# 2. Each user gets isolated thread management
# 3. Analytics are separated per account
# 4. Scheduling works independently per account
```

## 📊 Google Sheets Integration

### Sheet Structure
Create a Google Sheet with this exact column layout:

| A | B | C | D | E | F | ... | Y | Z | AA |
|---|---|---|---|---|---|-----|---|---|---|
| **ThreadID** | **Status** | **ScheduledTime** | **Tweet1** | **Tweet2** | **Tweet3** | ... | **PublishedURLs** | **Metrics** | **Notes** |
| T001 | draft | 2024-01-15 9:00 AM | First tweet content... | Second tweet content... | Third tweet... | | | | Campaign info |
| T002 | scheduled | 2024-01-15 2:00 PM | Product launch... | Feature highlights... | Call to action... | | | | Product launch |

### Column Definitions
- **ThreadID**: Unique identifier (auto-generated)
- **Status**: `draft`, `scheduled`, `published`, `failed`
- **ScheduledTime**: `YYYY-MM-DD HH:MM AM/PM` format
- **Tweet1-TweetN**: Tweet content (280 chars max each)
- **PublishedURLs**: Auto-populated after publishing
- **Metrics**: Auto-updated with performance data
- **Notes**: Your campaign notes

### Multi-Account Sheets
**Option 1**: Separate sheets per account
```
├── "@company_marketing_threads" 
├── "@product_updates_threads"
└── "@customer_support_threads"
```

**Option 2**: Single sheet with account column
Add an **Account** column to specify which Twitter account to use.

## 🎛️ Dashboard Usage

### User Dashboard
- **My Threads**: View threads for your Twitter account only
- **Create Thread**: Compose new threads with preview
- **Schedule Management**: Set publish times, edit scheduled threads
- **Analytics**: Performance metrics for your account
- **Settings**: Manage your Twitter credentials and preferences

### Admin Dashboard
- **All Accounts**: System-wide thread management
- **User Management**: Create/manage user accounts
- **System Metrics**: Performance monitoring
- **Cross-Account Analytics**: Compare performance across accounts

## 📈 Performance Monitoring

### Automatic Metrics Collection
- **Views**: Tweet impression count
- **Engagement**: Likes, retweets, replies, shares
- **Engagement Rate**: Calculated percentage
- **Historical Tracking**: 30-day rolling metrics
- **Trend Analysis**: Performance over time

### Dashboard Analytics
- Real-time charts and graphs
- Top performing threads
- Optimal posting times analysis
- Content performance insights
- Account growth tracking

## 🚀 Production Deployment (Google Cloud Platform)

### Free Tier Optimized
This application is specifically optimized for GCP's free tier:
- **F1 Instance**: 0.25 vCPU, 1GB RAM
- **Auto-scaling**: 0-1 instances
- **28 hours/day free**
- **Minimal memory footprint**

### One-Command Deployment
```bash
# One-time setup
npm run gcp:setup

# Deploy to production
npm run gcp:deploy

# Monitor logs
npm run gcp:logs

# Open your app
npm run gcp:browse
```

### Production Configuration
Your app will be available at: `https://your-project.appspot.com`

**Health Endpoints**:
- `/monitoring/health` - System health check
- `/monitoring/ping` - Load balancer ping

## 🔧 API Reference

### Authentication
All API endpoints require authentication via JWT token or API key.

```bash
# Login to get JWT token
curl -X POST https://your-app.appspot.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "your_username", "password": "your_password"}'

# Use token in subsequent requests
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://your-app.appspot.com/api/threads
```

### Key Endpoints

#### Thread Management
- `GET /api/threads` - List your threads
- `POST /api/threads` - Create new thread
- `PUT /api/threads/:id` - Update thread
- `POST /api/threads/:id/publish` - Publish immediately
- `POST /api/threads/:id/schedule` - Schedule for later

#### Analytics
- `GET /api/metrics/summary` - Account performance summary
- `GET /api/metrics/top-threads` - Best performing threads
- `POST /api/metrics/collect` - Refresh metrics

#### Google Sheets
- `POST /api/sheets/sync` - Bidirectional sync
- `GET /api/sheets/validate` - Test connection

## 🛡️ Security Features

### Data Protection
- **Encryption**: All credentials encrypted at rest
- **Isolation**: Complete data separation between accounts
- **Access Control**: Role-based permissions
- **Audit Logging**: All actions tracked with correlation IDs

### Authentication Methods
1. **JWT Tokens**: Web dashboard authentication
2. **API Keys**: Programmatic access with specific permissions
3. **Role-based Access**: User vs Admin capabilities

## 📁 Project Structure

```
twitter-thread-bot/
├── src/                          # TypeScript source code
│   ├── controllers/              # API route handlers
│   ├── services/                 # Business logic
│   ├── middleware/               # Authentication, logging, CORS
│   ├── routes/                   # API route definitions
│   ├── utils/                    # Utilities and helpers
│   └── types/                    # TypeScript definitions
├── dashboard/                    # Next.js analytics dashboard
│   ├── pages/                    # Dashboard pages
│   ├── components/               # React components
│   └── styles/                   # Styling
├── jobs/                         # Background tasks
│   ├── scheduler.ts              # Thread publishing scheduler
│   └── sheetsSync.ts             # Google Sheets sync
├── config/                       # Configuration files
├── database/                     # SQLite database files
├── docs/                         # Documentation
├── tests/                        # Test suites
├── app.yaml                      # GCP deployment config
├── ARCHITECTURE.md               # System architecture
├── FUNCTIONAL_DATA_FLOW.md       # Complete user journey
├── LOGGING_MONITORING.md         # Operations guide
└── DEPLOYMENT.md                 # Deployment instructions
```

## 🔍 Monitoring & Troubleshooting

### Built-in Logging
- **Development**: File-based logging with colors
- **Production**: GCP Stackdriver integration
- **Correlation IDs**: Track requests across services
- **Structured Logs**: JSON format for easy parsing

### Health Monitoring
```bash
# Check application health
curl https://your-app.appspot.com/monitoring/health

# View real-time logs
npm run gcp:logs

# Monitor performance in GCP Console
# → Monitoring → Dashboards → App Engine
```

### Common Troubleshooting
1. **Twitter API Issues**: Check API keys and permissions
2. **Sheets Sync Problems**: Verify service account permissions
3. **Authentication Errors**: Ensure JWT_SECRET is set
4. **Memory Issues**: Monitor GCP metrics dashboard

## 📚 Documentation

- **[Architecture Guide](ARCHITECTURE.md)**: System design and data flow
- **[Functional Data Flow](FUNCTIONAL_DATA_FLOW.md)**: Complete user journey
- **[Logging & Monitoring](LOGGING_MONITORING.md)**: Operations guide
- **[Deployment Guide](DEPLOYMENT.md)**: GCP deployment instructions
- **[Google Sheets Setup](docs/GOOGLE_SHEETS_SETUP.md)**: Sheets integration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Setup
```bash
# Install dependencies
npm install

# Run tests
npm test

# Type checking
npm run typecheck

# Linting
npm run lint

# Build
npm run build
```

## 📄 License

MIT License with Attribution Requirement

Copyright (c) 2024 **Vipul Gaur**

Permission is hereby granted, free of charge, to any person obtaining a copy of this software for personal use, education, or open source projects.

**Commercial Use**: Any commercial use, distribution, or derivative work must include prominent attribution to "Vipul Gaur" as the original creator.

See [LICENSE](LICENSE) file for complete terms.

## 🙏 Acknowledgments

- Twitter API v2 for thread publishing capabilities
- Google Sheets API for seamless integration
- Next.js and React for the dashboard interface
- Google Cloud Platform for hosting infrastructure
- The open source community for amazing tools and libraries

---

**Created with ❤️ by [Vipul Gaur](https://github.com/vipulgaur)**

For questions, support, or custom implementations, please open an issue or reach out directly.

## 🔗 Quick Links

- **[Live Demo](https://your-demo-url.appspot.com)** (if available)
- **[Documentation](docs/)** - Detailed guides
- **[Issue Tracker](https://github.com/yourusername/twitter-thread-bot/issues)** - Report bugs
- **[Discussions](https://github.com/yourusername/twitter-thread-bot/discussions)** - Community support

**⭐ Star this repo if it helped you automate your Twitter presence!**