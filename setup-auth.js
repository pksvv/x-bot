const axios = require('axios');
const readline = require('readline');

const BASE_URL = 'http://localhost:3000';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function setupAuthentication() {
  console.log('🔐 Twitter Thread Bot - Authentication Setup\n');
  console.log('This script will help you create your first admin user and API key.\n');

  try {
    // Check if server is running
    console.log('⏳ Checking if server is running...');
    await axios.get(`${BASE_URL}/health`);
    console.log('✅ Server is running!\n');

    // Get user details
    console.log('📝 Creating your admin account:');
    const username = await question('Enter username (admin): ') || 'admin';
    const email = await question('Enter email (admin@example.com): ') || 'admin@example.com';
    
    let password;
    while (!password || password.length < 8) {
      password = await question('Enter password (min 8 characters): ');
      if (!password || password.length < 8) {
        console.log('❌ Password must be at least 8 characters long');
      }
    }

    // Register user
    console.log('\n⏳ Creating user account...');
    try {
      const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
        username,
        email,
        password
      });

      console.log('✅ User account created successfully!');
      console.log(`User ID: ${registerResponse.data.data.user.id}`);
      
      const token = registerResponse.data.data.token;

      // Create API key
      console.log('\n⏳ Creating API key with full permissions...');
      const apiKeyResponse = await axios.post(`${BASE_URL}/api/auth/api-keys`, {
        keyName: 'Setup API Key',
        permissions: ['*'] // Full admin permissions
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ API key created successfully!\n');
      
      // Display results
      console.log('🎉 Setup Complete!\n');
      console.log('📋 Your credentials:');
      console.log('─'.repeat(50));
      console.log(`Username: ${username}`);
      console.log(`Email: ${email}`);
      console.log(`JWT Token: ${token}`);
      console.log(`API Key: ${apiKeyResponse.data.data.apiKey}`);
      console.log('─'.repeat(50));
      
      console.log('\n💡 How to use:');
      console.log('For web requests: Include header "Authorization: Bearer <jwt-token>"');
      console.log('For API requests: Include header "X-API-Key: <api-key>"');
      
      console.log('\n⚠️  Important:');
      console.log('- Store your credentials securely');
      console.log('- Add JWT_SECRET to your .env file for production');
      console.log('- The API key has full admin permissions');
      
      console.log('\n🧪 Test your setup:');
      console.log(`curl -H "X-API-Key: ${apiKeyResponse.data.data.apiKey}" ${BASE_URL}/api/threads`);

    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.error?.includes('already exists')) {
        console.log('⚠️  User already exists. Trying to login instead...');
        
        // Try to login
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
          username,
          password
        });
        
        console.log('✅ Login successful!');
        console.log(`JWT Token: ${loginResponse.data.data.token}`);
        
      } else {
        throw error;
      }
    }

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Cannot connect to server. Make sure the server is running on port 3000.');
      console.log('Run: npm run dev');
    } else {
      console.log('❌ Setup failed:', error.response?.data?.error || error.message);
    }
  } finally {
    rl.close();
  }
}

// Handle graceful exit
process.on('SIGINT', () => {
  console.log('\n👋 Setup cancelled');
  rl.close();
  process.exit(0);
});

setupAuthentication();