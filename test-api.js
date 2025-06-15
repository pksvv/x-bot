const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testAPI() {
  try {
    console.log('🧪 Testing Twitter Thread Bot API...\n');

    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check:', healthResponse.data);

    // Test 2: Create a thread
    console.log('\n2. Creating a new thread...');
    const threadData = {
      content: [
        "🧵 This is the first tweet in my test thread!",
        "🔗 This is the second tweet, continuing the discussion...", 
        "✨ And this is the final tweet wrapping up our thread!"
      ]
    };
    
    const createResponse = await axios.post(`${BASE_URL}/api/threads`, threadData);
    console.log('✅ Thread created:', createResponse.data);
    const threadId = createResponse.data.data.id;

    // Test 3: Get all threads
    console.log('\n3. Fetching all threads...');
    const allThreadsResponse = await axios.get(`${BASE_URL}/api/threads`);
    console.log('✅ All threads:', allThreadsResponse.data);

    // Test 4: Get specific thread
    console.log('\n4. Fetching specific thread...');
    const threadResponse = await axios.get(`${BASE_URL}/api/threads/${threadId}`);
    console.log('✅ Thread details:', threadResponse.data);

    // Test 5: Update thread
    console.log('\n5. Updating thread...');
    const updateData = {
      content: [
        "🧵 This is the UPDATED first tweet!",
        "🔗 This is the updated second tweet...", 
        "✨ And this is the updated final tweet!"
      ]
    };
    const updateResponse = await axios.put(`${BASE_URL}/api/threads/${threadId}`, updateData);
    console.log('✅ Thread updated:', updateResponse.data);

    // Test 6: Schedule thread (future date)
    console.log('\n6. Scheduling thread...');
    const scheduleDate = new Date(Date.now() + 60000); // 1 minute from now
    const scheduleResponse = await axios.post(`${BASE_URL}/api/threads/${threadId}/schedule`, {
      scheduledTime: scheduleDate.toISOString()
    });
    console.log('✅ Thread scheduled:', scheduleResponse.data);

    console.log('\n🎉 All API tests passed successfully!');
    console.log('\n📋 Available endpoints:');
    console.log('- GET /api/threads - List all threads');
    console.log('- POST /api/threads - Create new thread');
    console.log('- GET /api/threads/:id - Get specific thread');
    console.log('- PUT /api/threads/:id - Update thread');
    console.log('- DELETE /api/threads/:id - Delete thread');
    console.log('- POST /api/threads/:id/publish - Publish thread to Twitter');
    console.log('- POST /api/threads/:id/schedule - Schedule thread');
    console.log('- GET /api/threads/:id/metrics - Get thread metrics');

  } catch (error) {
    console.error('❌ API test failed:', error.response?.data || error.message);
  }
}

// Run tests
testAPI();