const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function setupDashboardDemo() {
  console.log('🚀 Setting up Twitter Thread Bot Dashboard Demo...\n');

  try {
    // Create some sample threads for the dashboard
    const sampleThreads = [
      {
        content: [
          "🧵 The future of AI is here! Let me share some insights about machine learning trends in 2024",
          "📊 First, let's talk about Large Language Models. They've revolutionized how we interact with AI",
          "🔍 The key breakthrough has been in understanding context and maintaining coherent conversations",
          "✨ What's next? I believe we'll see more specialized AI tools for specific industries and use cases"
        ]
      },
      {
        content: [
          "💡 5 productivity tips that changed my workflow completely",
          "1️⃣ Time blocking: Schedule specific times for different types of work",
          "2️⃣ The 2-minute rule: If it takes less than 2 minutes, do it immediately",
          "3️⃣ Batch similar tasks together to maintain focus and momentum"
        ]
      },
      {
        content: [
          "🚀 Building in public: Day 30 of my startup journey",
          "📈 Revenue this month: $2,847 (up 23% from last month)",
          "👥 New users: 156 signups, 89% retention rate",
          "🎯 Next month's goal: Reach $5k MRR and launch mobile app"
        ]
      },
      {
        content: [
          "🌟 The art of asking better questions",
          "Instead of 'How do I get more followers?' ask 'How can I provide more value to my audience?'",
          "Instead of 'Why isn't this working?' ask 'What can I learn from this situation?'",
          "Quality questions lead to quality answers and better outcomes"
        ]
      }
    ];

    console.log('📝 Creating sample threads...');
    for (let i = 0; i < sampleThreads.length; i++) {
      try {
        const response = await axios.post(`${BASE_URL}/api/threads`, sampleThreads[i]);
        if (response.data.success) {
          console.log(`✅ Created thread ${i + 1}: ${response.data.data.id}`);
        }
      } catch (error) {
        console.log(`❌ Failed to create thread ${i + 1}`);
      }
    }

    // Check API status
    console.log('\n🔍 Checking API endpoints...');
    const endpoints = [
      { name: 'Health Check', url: '/' },
      { name: 'Threads API', url: '/api/threads' },
      { name: 'Metrics API', url: '/api/metrics/summary' },
      { name: 'Sheets API', url: '/api/sheets/validate' }
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${BASE_URL}${endpoint.url}`);
        console.log(`✅ ${endpoint.name}: Working`);
      } catch (error) {
        console.log(`❌ ${endpoint.name}: Error`);
      }
    }

    console.log('\n🎉 Dashboard demo setup complete!');
    console.log('\n📊 Dashboard Features Available:');
    console.log('- 📈 Analytics dashboard with charts and metrics');
    console.log('- 📝 Thread management (create, edit, delete, schedule)');
    console.log('- 📅 Scheduling interface with calendar view');
    console.log('- 📋 Google Sheets integration panel');
    console.log('- ⚙️ Settings and configuration');

    console.log('\n🚀 To start the dashboard:');
    console.log('npm run dashboard');
    console.log('\nThen open: http://localhost:3001');

    console.log('\n💡 Dashboard Highlights:');
    console.log('- Real-time data from your API');
    console.log('- Beautiful charts with Chart.js');
    console.log('- Responsive design with Tailwind CSS');
    console.log('- Thread creation and scheduling UI');
    console.log('- Metrics visualization and analytics');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('\n🔧 Make sure the API server is running on port 3000');
  }
}

setupDashboardDemo();