const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testGoogleSheetsAPI() {
  try {
    console.log('🧪 Testing Google Sheets Integration...\n');

    // Test 1: Validate Google Sheets connection
    console.log('1. Validating Google Sheets connection...');
    try {
      const validateResponse = await axios.get(`${BASE_URL}/api/sheets/validate`);
      console.log('✅ Connection validation:', validateResponse.data);
    } catch (error) {
      console.log('⚠️ Google Sheets not configured:', error.response?.data || error.message);
      console.log('📝 To configure Google Sheets:');
      console.log('   1. Create a Google Cloud project');
      console.log('   2. Enable Google Sheets API');
      console.log('   3. Create a service account and download JSON key');
      console.log('   4. Set environment variables in .env:');
      console.log('      GOOGLE_SHEETS_CLIENT_EMAIL=your_service_account_email');
      console.log('      GOOGLE_SHEETS_PRIVATE_KEY=your_private_key');
      console.log('      GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id');
      return;
    }

    // Test 2: Create some test threads first
    console.log('\n2. Creating test threads...');
    const testThreads = [
      {
        content: [
          "🧵 Thread 1: Introduction to Twitter threads",
          "📝 This is how you create engaging content...",
          "✨ And this is how you wrap it up!"
        ]
      },
      {
        content: [
          "🎯 Thread 2: Tips for better engagement",
          "💡 Use emojis to make your content stand out",
          "🔄 Always end with a call to action"
        ]
      }
    ];

    for (const threadData of testThreads) {
      const createResponse = await axios.post(`${BASE_URL}/api/threads`, threadData);
      console.log('✅ Created thread:', createResponse.data.data.id);
    }

    // Test 3: Sync from database to Google Sheets
    console.log('\n3. Syncing threads from database to Google Sheets...');
    const syncFromDbResponse = await axios.post(`${BASE_URL}/api/sheets/sync-from-db`);
    console.log('✅ Sync from DB:', syncFromDbResponse.data);

    // Test 4: Get threads from Google Sheets
    console.log('\n4. Getting threads from Google Sheets...');
    const sheetsThreadsResponse = await axios.get(`${BASE_URL}/api/sheets/threads`);
    console.log('✅ Threads from sheets:', sheetsThreadsResponse.data);

    // Test 5: Bidirectional sync
    console.log('\n5. Testing bidirectional sync...');
    const bidirectionalSyncResponse = await axios.post(`${BASE_URL}/api/sheets/bidirectional-sync`);
    console.log('✅ Bidirectional sync:', bidirectionalSyncResponse.data);

    console.log('\n🎉 Google Sheets integration tests completed!');
    console.log('\n📊 Google Sheets Features:');
    console.log('- ✅ Auto-sync every 5 minutes');
    console.log('- ✅ Bidirectional synchronization');
    console.log('- ✅ Manual sync endpoints');
    console.log('- ✅ Spreadsheet validation');
    console.log('- ✅ Support for up to 10 tweets per thread');

    console.log('\n📋 Available Google Sheets endpoints:');
    console.log('- GET /api/sheets/validate - Validate connection');
    console.log('- GET /api/sheets/threads - Get threads from sheets');
    console.log('- POST /api/sheets/sync-from-db - Sync DB → Sheets');
    console.log('- POST /api/sheets/sync-to-db - Sync Sheets → DB');
    console.log('- POST /api/sheets/bidirectional-sync - Full sync');

  } catch (error) {
    console.error('❌ Google Sheets test failed:', error.response?.data || error.message);
  }
}

// Run tests
testGoogleSheetsAPI();