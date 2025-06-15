# Twitter Thread Bot

A comprehensive Twitter thread automation bot with analytics dashboard, Google Sheets integration, and scheduled posting capabilities.

## Features

- 🐦 **Twitter API Integration** - Post threads automatically
- 📊 **Analytics Dashboard** - Track thread performance with Chart.js
- 📋 **Google Sheets Integration** - Manage threads from spreadsheets with metrics
- ⏰ **Scheduled Posting** - Cron-based thread scheduling
- 📈 **Metrics Collection** - Automatic Twitter analytics collection
- 💾 **SQLite Database** - Store threads and metrics
- 🔒 **Authentication & Security** - JWT tokens, API keys, role-based access control
- 🛡️ **Rate Limiting** - Configurable rate limits for different endpoints

## Prerequisites

- Node.js 18.0.0 or higher
- Twitter Developer Account with API keys
- Google Cloud Project with Sheets API enabled (optional)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure your API keys:

```bash
cp .env.example .env
```

Edit `.env` with your actual credentials:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Twitter API Configuration
TWITTER_API_KEY=your_actual_api_key
TWITTER_API_SECRET=your_actual_api_secret
TWITTER_ACCESS_TOKEN=your_actual_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_actual_access_token_secret
TWITTER_BEARER_TOKEN=your_actual_bearer_token

# Google Sheets API Configuration (Optional)
GOOGLE_SHEETS_CLIENT_EMAIL=your_service_account_email@your-project.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY=your_google_sheets_private_key
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id

# Authentication & Security Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production-please
SESSION_SECRET=your-session-secret-key

# Rate Limiting Configuration (Optional - defaults provided)
GENERAL_RATE_LIMIT_WINDOW_MS=900000
GENERAL_RATE_LIMIT_MAX=100
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=5
API_RATE_LIMIT_WINDOW_MS=60000
API_RATE_LIMIT_MAX=60
```

### 3. Database Setup

The SQLite database will be created automatically when you first run the application.

### 4. Authentication Setup

The application uses JWT-based authentication with optional API key support. On first run, you'll need to create a user account.

#### Creating Your First User Account

Once the server is running, create an admin user account:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "your-secure-password-here"
  }'
```

#### Authentication Methods

The API supports two authentication methods:

1. **JWT Tokens** (recommended for web applications)
   - Login to get a JWT token
   - Include in requests: `Authorization: Bearer <token>`

2. **API Keys** (recommended for programmatic access)
   - Create API keys with specific permissions
   - Include in requests: `X-API-Key: <api-key>`

#### Creating API Keys

After logging in, create API keys for programmatic access:

```bash
# Login first to get a token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "your-secure-password-here"
  }'

# Use the token to create an API key
curl -X POST http://localhost:3000/api/auth/api-keys \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -d '{
    "keyName": "My Bot Key",
    "permissions": ["threads:read", "threads:write", "threads:publish", "metrics:read"]
  }'
```

#### Permission System

The application uses a granular permission system:

- `threads:read` - View threads
- `threads:write` - Create/edit threads  
- `threads:delete` - Delete threads
- `threads:publish` - Publish threads
- `threads:schedule` - Schedule threads
- `metrics:read` - View analytics
- `metrics:collect` - Collect metrics
- `sheets:read` - View Google Sheets data
- `sheets:sync` - Sync with Google Sheets
- `*` - All permissions (admin only)

## Running the Application

### Development Mode

```bash
# Start the main API server
npm run dev

# Start the analytics dashboard (in another terminal)
npm run dashboard
```

### Production Mode

```bash
# Build the TypeScript code
npm run build

# Start the production server
npm start

# Build and start dashboard
npm run build:dashboard
npm run start:dashboard
```

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Start production server
- `npm run test` - Run tests
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking
- `npm run dashboard` - Start Next.js dashboard in development
- `npm run build:dashboard` - Build dashboard for production
- `npm run start:dashboard` - Start dashboard in production

### Testing Connections

Use the provided test files to verify your setup:

```bash
# Test Twitter API connection
node test.js

# Test bot functionality
node bot.js

# Test complete API functionality
node test-api.js

# Test Google Sheets integration
node test-sheets.js

# Test metrics collection system
node test-metrics.js
```

## Usage

### API Endpoints

The server runs on `http://localhost:3000` by default.

- `GET /` - Health check
- `POST /api/threads` - Create new thread
- `GET /api/threads` - List all threads  
- `PUT /api/threads/:id` - Update thread
- `DELETE /api/threads/:id` - Delete thread
- `POST /api/threads/:id/schedule` - Schedule thread
- `POST /api/threads/:id/publish` - Publish thread immediately
- `GET /api/metrics/summary` - Get analytics summary
- `GET /api/metrics/top-threads` - Get top performing threads
- `POST /api/metrics/collect` - Collect metrics for all threads
- `GET /api/sheets/validate` - Test Google Sheets connection
- `POST /api/sheets/sync-from-db` - Sync database to Google Sheets
- `POST /api/sheets/sync-to-db` - Sync Google Sheets to database

### Dashboard

Access the analytics dashboard at `http://localhost:3001` to view:
- Thread performance metrics
- Engagement analytics
- Scheduling interface
- Historical data

### Scheduling Threads

The bot automatically checks for scheduled threads every minute and publishes them at the specified time.

## Project Structure

```
twitter-thread-bot/
├── src/                    # Source code
│   ├── controllers/        # API route handlers
│   ├── services/          # Business logic (Twitter, Google Sheets)
│   ├── types/             # TypeScript definitions
│   ├── utils/             # Utility functions
│   ├── middleware/        # Express middleware
│   └── index.ts           # Main server file
├── config/                # Configuration files
│   └── database.ts        # Database setup
├── jobs/                  # Scheduled tasks
│   └── scheduler.ts       # Cron job scheduler
├── dashboard/             # Next.js analytics dashboard
│   ├── pages/            # Dashboard pages
│   ├── components/       # React components
│   └── styles/           # CSS styles
├── database/             # SQLite database files
├── dist/                 # Compiled JavaScript (generated)
└── README.md             # This file
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 3000) |
| `TWITTER_API_KEY` | Twitter API key | Yes |
| `TWITTER_API_SECRET` | Twitter API secret | Yes |
| `TWITTER_ACCESS_TOKEN` | Twitter access token | Yes |
| `TWITTER_ACCESS_TOKEN_SECRET` | Twitter access token secret | Yes |
| `TWITTER_BEARER_TOKEN` | Twitter bearer token | Yes |
| `GOOGLE_SHEETS_CLIENT_EMAIL` | Google service account email | No |
| `GOOGLE_SHEETS_PRIVATE_KEY` | Google service account private key | No |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Google Sheets spreadsheet ID | No |

## Troubleshooting

### Common Issues

1. **Twitter API Connection Fails**
   - Verify your API keys are correct
   - Ensure your Twitter app has read/write permissions
   - Check that your access tokens are valid

2. **Database Errors**
   - Ensure the `database/` directory exists
   - Check file permissions for SQLite database

3. **Dashboard Not Loading**
   - Make sure you're running `npm run dashboard` in a separate terminal
   - Check that port 3001 is available

### Logs

Check the console output for detailed error messages and debugging information.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License - see LICENSE file for details.