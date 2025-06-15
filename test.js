const { TwitterApi } = require('twitter-api-v2');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

// Twitter API Test
async function testTwitterAPI() {
    console.log('🐦 Testing Twitter API...');
    
    try {
        const client = new TwitterApi({
            appKey: process.env.TWITTER_API_KEY,
            appSecret: process.env.TWITTER_API_SECRET,
            accessToken: process.env.TWITTER_ACCESS_TOKEN,
            accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
        });

        // Test 1: Get current user info
        const me = await client.v2.me();
        console.log('✅ Twitter connection successful!');
        console.log('User info:', me.data);

        // Test 2: Search recent tweets (using Bearer token for better reliability)
        const bearerClient = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);
        const tweets = await bearerClient.v2.search('javascript', { 
            max_results: 10,
            'tweet.fields': 'author_id,created_at'
        });
        console.log('✅ Search tweets successful!');
        console.log('Found tweets:', tweets.data?.data?.length || 0);

        // Test 3: Post a test tweet (uncomment if you want to test posting)
        // const tweet = await client.v2.tweet('Testing API connection! 🚀');
        // console.log('✅ Tweet posted successfully!', tweet.data);

        return true;
    } catch (error) {
        console.error('❌ Twitter API Error:', error.message);
        return false;
    }
}

// Google Sheets API Test
async function testGoogleSheetsAPI() {
    console.log('📊 Testing Google Sheets API...');
    
    try {
        // Initialize auth
        const serviceAccountAuth = new JWT({
            email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
            key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        // Initialize the sheet
        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEETS_SPREADSHEET_ID, serviceAccountAuth);
        await doc.loadInfo();
        
        console.log('✅ Google Sheets connection successful!');
        console.log('Sheet title:', doc.title);
        console.log('Number of sheets:', doc.sheetCount);

        // Get the first sheet
        const sheet = doc.sheetsByIndex[0];
        console.log('First sheet title:', sheet.title);

        // Test 1: Write some test data
        const testData = [
            ['Timestamp', 'Source', 'Data', 'Status'],
            [new Date().toISOString(), 'API Test', 'Sample data', 'Success'],
            [new Date().toISOString(), 'Twitter API', 'Connection test', 'Active'],
            [new Date().toISOString(), 'Google Sheets', 'Write test', 'Complete']
        ];

        // Clear sheet and add headers first
        await sheet.clear();
        await sheet.setHeaderRow(['Timestamp', 'Source', 'Data', 'Status']);
        
        // Add data rows
        const dataRows = testData.slice(1); // Skip header row
        await sheet.addRows(dataRows);
        console.log('✅ Test data written to sheet!');

        // Test 2: Read the data back
        const rows = await sheet.getRows();
        console.log('✅ Data read from sheet:');
        rows.forEach((row, index) => {
            if (index < 3) { // Show first 3 rows
                console.log(`Row ${index + 1}:`, {
                    timestamp: row.get('Timestamp'),
                    source: row.get('Source'),
                    data: row.get('Data'),
                    status: row.get('Status')
                });
            }
        });

        return true;
    } catch (error) {
        console.error('❌ Google Sheets API Error:', error.message);
        return false;
    }
}

// Combined API Test - Twitter to Sheets
async function testCombinedWorkflow() {
    console.log('🔄 Testing combined Twitter → Sheets workflow...');
    
    try {
        // Add delay to avoid rate limits
        console.log('⏳ Waiting 2 seconds to avoid rate limits...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Get Twitter data using Bearer token
        const twitterClient = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);

        const tweets = await twitterClient.v2.search('technology', { 
            max_results: 5,
            'tweet.fields': 'author_id,created_at'
        });

        if (!tweets.data?.data) {
            throw new Error('No tweets found');
        }

        // Prepare data for sheets
        const sheetsData = tweets.data.data.map(tweet => [
            tweet.id,
            tweet.author_id,
            tweet.created_at,
            tweet.text ? tweet.text.substring(0, 100) + '...' : 'No text', // Truncate long text
            'New', // Status
            new Date().toISOString() // Added timestamp
        ]);

        // Write to Google Sheets
        const serviceAccountAuth = new JWT({
            email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
            key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEETS_SPREADSHEET_ID, serviceAccountAuth);
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];
        
        // Set headers and add data
        await sheet.clear();
        await sheet.setHeaderRow(['Tweet ID', 'Author ID', 'Created At', 'Text', 'Status', 'Processed At']);
        await sheet.addRows(sheetsData);

        console.log('✅ Combined workflow successful!');
        console.log(`📊 ${tweets.data.data.length} tweets saved to Google Sheets`);
        
        return true;
    } catch (error) {
        console.error('❌ Combined workflow error:', error.message);
        return false;
    }
}

// Main test function
async function runAllTests() {
    console.log('🚀 Starting API Tests...\n');
    
    // Check environment variables
    const requiredEnvVars = [
        'TWITTER_API_KEY',
        'TWITTER_API_SECRET', 
        'TWITTER_ACCESS_TOKEN',
        'TWITTER_ACCESS_TOKEN_SECRET',
        'TWITTER_BEARER_TOKEN',
        'GOOGLE_SHEETS_CLIENT_EMAIL',
        'GOOGLE_SHEETS_PRIVATE_KEY',
        'GOOGLE_SHEETS_SPREADSHEET_ID'
    ];

    const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingVars.length > 0) {
        console.error('❌ Missing environment variables:', missingVars.join(', '));
        console.log('Please check your .env file');
        return;
    }

    console.log('✅ All environment variables found\n');

    // Run tests
    const twitterResult = await testTwitterAPI();
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const sheetsResult = await testGoogleSheetsAPI();
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Add delay before combined test
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const combinedResult = await testCombinedWorkflow();
    
    // Summary
    console.log('\n🎯 Test Summary:');
    console.log(`Twitter API: ${twitterResult ? '✅ Success' : '❌ Failed'}`);
    console.log(`Google Sheets API: ${sheetsResult ? '✅ Success' : '❌ Failed'}`);
    console.log(`Combined Workflow: ${combinedResult ? '✅ Success' : '❌ Failed'}`);
    
    if (twitterResult && sheetsResult && combinedResult) {
        console.log('\n🎉 All tests passed! Your APIs are ready to use.');
    } else {
        console.log('\n⚠️  Some tests failed. Check the error messages above.');
    }
}

// Export functions for individual testing
module.exports = {
    testTwitterAPI,
    testGoogleSheetsAPI,
    testCombinedWorkflow,
    runAllTests
};

// Run all tests if this file is executed directly
if (require.main === module) {
    runAllTests();
}