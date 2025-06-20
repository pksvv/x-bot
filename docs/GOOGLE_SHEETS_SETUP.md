# Google Sheets Integration Setup

This guide will help you set up Google Sheets integration for managing your Twitter threads with automatic metrics collection and analytics.

## Features

- 📊 **Thread Management** - Create, edit, and schedule threads directly in Google Sheets
- 📈 **Automatic Metrics** - Real-time performance data synced to your spreadsheet
- 🔄 **Bidirectional Sync** - Changes sync between database and Google Sheets
- ⚡ **Auto-Updates** - Metrics refresh every 2 hours, sheets sync every 5 minutes
- 🏆 **Performance Tracking** - Engagement rates, views, likes, retweets, replies

## Prerequisites

- Google Cloud Platform account
- A Google Sheets spreadsheet

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

## Step 2: Enable Google Sheets API

1. In the Google Cloud Console, go to **APIs & Services > Library**
2. Search for "Google Sheets API"
3. Click on it and press **Enable**

## Step 3: Create Service Account

1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > Service Account**
3. Fill in the service account details:
   - Name: `twitter-thread-bot`
   - Description: `Service account for Twitter Thread Bot`
4. Click **Create and Continue**
5. Skip role assignment for now (click **Continue**)
6. Click **Done**

## Step 4: Generate Service Account Key

1. In the **Credentials** page, find your service account
2. Click on the service account email
3. Go to the **Keys** tab
4. Click **Add Key > Create New Key**
5. Choose **JSON** format
6. Click **Create**
7. Save the downloaded JSON file securely

## Step 5: Extract Credentials

From the downloaded JSON file, you'll need:
- `client_email` - The service account email
- `private_key` - The private key (keep the `\n` characters)

## Step 6: Create Google Spreadsheet

1. Go to [Google Sheets](https://sheets.google.com/)
2. Create a new spreadsheet
3. Name it "Twitter Thread Bot"
4. Copy the spreadsheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
   ```

## Step 7: Share Spreadsheet with Service Account

1. In your Google Sheet, click **Share**
2. Add the service account email (from step 5) as an **Editor**
3. Click **Send**

## Step 8: Configure Environment Variables

Add these to your `.env` file:

```env
# Google Sheets Configuration
GOOGLE_SHEETS_CLIENT_EMAIL=your_service_account_email@your-project.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_from_url
```

**Important Notes:**
- Keep the quotes around the private key
- Don't remove the `\n` characters in the private key
- Make sure the spreadsheet ID is correct

## Step 9: Test Connection

1. Start your application:
   ```bash
   npm run dev
   ```

2. Test the connection:
   ```bash
   node test-sheets.js
   ```

## Spreadsheet Structure

The integration automatically creates a worksheet with these columns:

### Thread Content & Management
| Column | Description |
|--------|-------------|
| id | Unique thread identifier |
| tweet1-tweet10 | Individual tweets (up to 10 per thread) |
| scheduledTime | When to publish (ISO format) |
| status | Thread status (draft/scheduled/published/failed) |
| publishedTime | When it was published |

### Performance Metrics (Auto-populated)
| Column | Description |
|--------|-------------|
| views | Total views across all tweets in thread |
| likes | Total likes across all tweets |
| retweets | Total retweets |
| replies | Total replies |
| impressions | Total impressions |
| engagementRate | Calculated engagement percentage |

### Additional
| Column | Description |
|--------|-------------|
| notes | Additional notes or comments |

**Note:** Metrics columns are automatically populated when threads are published and metrics are collected. These update every 2 hours automatically or can be manually refreshed via API.

## Usage

### Manual Sync Operations

```bash
# Sync from database to Google Sheets
curl -X POST http://localhost:3000/api/sheets/sync-from-db

# Sync from Google Sheets to database  
curl -X POST http://localhost:3000/api/sheets/sync-to-db

# Bidirectional sync
curl -X POST http://localhost:3000/api/sheets/bidirectional-sync
```

### Automatic Sync

The system automatically syncs every 5 minutes when properly configured.

### Metrics Collection

The system automatically collects Twitter metrics every 2 hours for published threads:

```bash
# Manual metrics collection for all threads
curl -X POST http://localhost:3000/api/metrics/collect

# Collect metrics for specific thread
curl -X POST http://localhost:3000/api/metrics/collect/THREAD_ID

# Get metrics summary
curl -X GET http://localhost:3000/api/metrics/summary

# Get top performing threads
curl -X GET http://localhost:3000/api/metrics/top-threads
```

## Troubleshooting

### Common Issues

1. **"Invalid credentials"**
   - Check that your private key is properly formatted
   - Ensure the service account email is correct

2. **"Spreadsheet not found"**
   - Verify the spreadsheet ID is correct
   - Make sure you shared the sheet with the service account

3. **"Permission denied"**
   - Ensure the service account has Editor access to the spreadsheet
   - Check that Google Sheets API is enabled

### Testing

Run the test scripts to verify everything is working:

```bash
# Test Google Sheets integration
node test-sheets.js

# Test metrics collection system
node test-metrics.js

# Test complete API functionality  
node test-api.js
```

These will test all functionality and provide detailed feedback about:
- Google Sheets connectivity and sync
- Metrics collection and analytics
- Complete API functionality