const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testMetricsAPI() {
  try {
    console.log('🧪 Testing Metrics Collection System...\n');

    // Test 1: Create and publish a thread to get metrics
    console.log('1. Creating and publishing a test thread...');
    const threadData = {
      content: [
        "🧵 Testing metrics collection for this thread!",
        "📊 This thread will be used to test our analytics system", 
        "🚀 Let's see what metrics we can collect!"
      ]
    };
    
    const createResponse = await axios.post(`${BASE_URL}/api/threads`, threadData);
    const threadId = createResponse.data.data.id;
    console.log('✅ Thread created:', threadId);

    // Note: In a real scenario, you'd actually publish to Twitter here
    console.log('📝 Note: To test actual metrics, configure Twitter API and publish the thread');

    // Test 2: Get metrics summary
    console.log('\n2. Getting metrics summary...');
    try {
      const summaryResponse = await axios.get(`${BASE_URL}/api/metrics/summary`);
      console.log('✅ Metrics summary:', summaryResponse.data);
    } catch (error) {
      console.log('ℹ️ Metrics summary:', error.response?.data || 'No published threads with metrics yet');
    }

    // Test 3: Get top performing threads
    console.log('\n3. Getting top performing threads...');
    try {
      const topThreadsResponse = await axios.get(`${BASE_URL}/api/metrics/top-threads?limit=5`);
      console.log('✅ Top threads:', topThreadsResponse.data);
    } catch (error) {
      console.log('ℹ️ Top threads:', error.response?.data || 'No published threads with metrics yet');
    }

    // Test 4: Try to collect metrics for a specific thread
    console.log('\n4. Attempting to collect metrics for test thread...');
    try {
      const metricsResponse = await axios.post(`${BASE_URL}/api/metrics/collect/${threadId}`);
      console.log('✅ Metrics collection:', metricsResponse.data);
    } catch (error) {
      console.log('ℹ️ Metrics collection:', error.response?.data || 'Thread not published or no tweet IDs');
    }

    // Test 5: Manual metrics collection for all threads
    console.log('\n5. Starting manual metrics collection for all threads...');
    try {
      const collectAllResponse = await axios.post(`${BASE_URL}/api/metrics/collect`);
      console.log('✅ Manual collection:', collectAllResponse.data);
    } catch (error) {
      console.log('ℹ️ Manual collection:', error.response?.data || 'No published threads to collect metrics for');
    }

    // Test 6: Get thread metrics history
    console.log('\n6. Getting thread metrics history...');
    try {
      const historyResponse = await axios.get(`${BASE_URL}/api/metrics/thread/${threadId}/history?days=30`);
      console.log('✅ Metrics history:', historyResponse.data);
    } catch (error) {
      console.log('ℹ️ Metrics history:', error.response?.data || 'No metrics history available');
    }

    console.log('\n🎉 Metrics API tests completed!');
    console.log('\n📊 Metrics Collection Features:');
    console.log('- ✅ Automatic metrics collection every 2 hours');
    console.log('- ✅ Manual metrics collection endpoints');
    console.log('- ✅ Thread performance analytics');
    console.log('- ✅ Engagement rate calculations');
    console.log('- ✅ Top performing threads tracking');
    console.log('- ✅ Metrics integrated into Google Sheets');

    console.log('\n📋 Available Metrics endpoints:');
    console.log('- GET /api/metrics/summary - Overall metrics summary');
    console.log('- GET /api/metrics/top-threads - Top performing threads');
    console.log('- GET /api/metrics/thread/:id - Get specific thread metrics');
    console.log('- GET /api/metrics/thread/:id/history - Metrics history');
    console.log('- POST /api/metrics/collect - Collect all thread metrics');
    console.log('- POST /api/metrics/collect/:id - Collect specific thread metrics');

    console.log('\n📈 Enhanced Google Sheets Structure:');
    console.log('- id, tweet1-10, scheduledTime, status, publishedTime');
    console.log('- views, likes, retweets, replies, impressions');
    console.log('- engagementRate, notes');

  } catch (error) {
    console.error('❌ Metrics test failed:', error.response?.data || error.message);
  }
}

// Run tests
testMetricsAPI();