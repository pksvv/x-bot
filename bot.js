const { TwitterApi } = require('twitter-api-v2');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

class TwitterSheetsBot {
    constructor() {
        // Twitter client setup
        this.twitterClient = new TwitterApi({
            appKey: process.env.TWITTER_API_KEY,
            appSecret: process.env.TWITTER_API_SECRET,
            accessToken: process.env.TWITTER_ACCESS_TOKEN,
            accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
        });

        // Bearer token client for search (higher rate limits)
        this.bearerClient = new TwitterApi(process.env.TWITTER_BEARER_TOKEN);

        // Google Sheets setup
        this.serviceAuth = new JWT({
            email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
            key: process.env.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
    }

    // Get sheet instance
    async getSheet() {
        const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEETS_SPREADSHEET_ID, this.serviceAuth);
        await doc.loadInfo();
        return doc.sheetsByIndex[0]; // First sheet
    }

    // Add delay to avoid rate limits
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Log activity to Google Sheets
    async logActivity(activity, status = 'Success', data = '') {
        try {
            const sheet = await this.getSheet();
            
            // Ensure headers exist
            const rows = await sheet.getRows();
            if (rows.length === 0) {
                await sheet.setHeaderRow(['Timestamp', 'Activity', 'Status', 'Data', 'User']);
            }

            await sheet.addRow({
                'Timestamp': new Date().toISOString(),
                'Activity': activity,
                'Status': status,
                'Data': data,
                'User': 'TechCheckDeck'
            });

            console.log(`📊 Logged: ${activity} - ${status}`);
        } catch (error) {
            console.error('❌ Sheet logging error:', error.message);
        }
    }

    // Get current user info
    async getCurrentUser() {
        try {
            const me = await this.twitterClient.v2.me();
            await this.logActivity('Get User Info', 'Success', `User: ${me.data.username}`);
            return me.data;
        } catch (error) {
            await this.logActivity('Get User Info', 'Failed', error.message);
            throw error;
        }
    }

    // Post a tweet
    async postTweet(text) {
        try {
            const tweet = await this.twitterClient.v2.tweet(text);
            await this.logActivity('Post Tweet', 'Success', `Tweet ID: ${tweet.data.id}`);
            console.log('✅ Tweet posted:', tweet.data.id);
            return tweet.data;
        } catch (error) {
            await this.logActivity('Post Tweet', 'Failed', error.message);
            console.error('❌ Tweet failed:', error.message);
            throw error;
        }
    }

    // Search tweets (with rate limit handling)
    async searchTweets(query, maxResults = 10) {
        try {
            console.log(`🔍 Searching for: "${query}"`);
            
            const tweets = await this.bearerClient.v2.search(query, { 
                max_results: maxResults,
                'tweet.fields': 'author_id,created_at,public_metrics'
            });

            if (tweets.data?.data) {
                await this.logActivity('Search Tweets', 'Success', `Found ${tweets.data.data.length} tweets for "${query}"`);
                console.log(`✅ Found ${tweets.data.data.length} tweets`);
                return tweets.data.data;
            } else {
                await this.logActivity('Search Tweets', 'No Results', `Query: "${query}"`);
                console.log('ℹ️ No tweets found');
                return [];
            }
        } catch (error) {
            if (error.message.includes('429')) {
                await this.logActivity('Search Tweets', 'Rate Limited', `Query: "${query}"`);
                console.log('⚠️ Rate limited - waiting 15 minutes...');
                // In real app, you'd implement a queue or retry mechanism
                throw new Error('Rate limited. Try again in 15 minutes.');
            } else {
                await this.logActivity('Search Tweets', 'Failed', error.message);
                throw error;
            }
        }
    }

    // Save tweets to sheets
    async saveTweetsToSheet(tweets, sheetName = 'Tweets') {
        try {
            const sheet = await this.getSheet();
            
            // Ensure proper headers
            await sheet.clear();
            await sheet.setHeaderRow(['Tweet ID', 'Author ID', 'Created At', 'Text', 'Likes', 'Retweets', 'Saved At']);
            
            const rows = tweets.map(tweet => ({
                'Tweet ID': tweet.id,
                'Author ID': tweet.author_id,
                'Created At': tweet.created_at,
                'Text': tweet.text ? tweet.text.substring(0, 200) : 'No text',
                'Likes': tweet.public_metrics?.like_count || 0,
                'Retweets': tweet.public_metrics?.retweet_count || 0,
                'Saved At': new Date().toISOString()
            }));

            await sheet.addRows(rows);
            await this.logActivity('Save Tweets', 'Success', `Saved ${tweets.length} tweets`);
            console.log(`✅ Saved ${tweets.length} tweets to sheet`);
        } catch (error) {
            await this.logActivity('Save Tweets', 'Failed', error.message);
            throw error;
        }
    }

    // Complete workflow: Search and save
    async searchAndSave(query, maxResults = 10) {
        try {
            console.log(`🚀 Starting search and save workflow for: "${query}"`);
            
            const tweets = await this.searchTweets(query, maxResults);
            
            if (tweets.length > 0) {
                await this.delay(1000); // Small delay
                await this.saveTweetsToSheet(tweets);
                
                console.log(`🎉 Workflow complete! Saved ${tweets.length} tweets about "${query}"`);
                return tweets;
            } else {
                console.log('ℹ️ No tweets to save');
                return [];
            }
        } catch (error) {
            console.error('❌ Workflow failed:', error.message);
            throw error;
        }
    }

    // Test all functionality
    async runTests() {
        console.log('🧪 Running bot tests...\n');

        try {
            // Test 1: User info
            console.log('1️⃣ Testing user authentication...');
            const user = await this.getCurrentUser();
            console.log(`✅ Authenticated as: ${user.username}\n`);

            // Test 2: Sheet logging
            console.log('2️⃣ Testing sheet logging...');
            await this.logActivity('Bot Test', 'Running', 'Testing all functionality');
            console.log('✅ Sheet logging works\n');

            // Test 3: Tweet posting (commented out to avoid spam)
            console.log('3️⃣ Tweet posting ready (uncomment to test)\n');
            // await this.postTweet('Testing my Twitter bot! 🤖 #API');

            console.log('🎉 Basic tests passed! Bot is ready to use.');
            console.log('\n📋 Available methods:');
            console.log('- getCurrentUser()');
            console.log('- postTweet(text)');
            console.log('- searchTweets(query, maxResults)');
            console.log('- saveTweetsToSheet(tweets)');
            console.log('- searchAndSave(query, maxResults)');

        } catch (error) {
            console.error('❌ Test failed:', error.message);
        }
    }
}

// Example usage
async function main() {
    const bot = new TwitterSheetsBot();
    
    // Run basic tests
    await bot.runTests();
    
    // Example workflows (uncomment to use):
    
    // 1. Search and save tweets (be careful of rate limits)
    // try {
    //     await bot.searchAndSave('javascript programming', 5);
    // } catch (error) {
    //     console.log('Search failed (probably rate limited):', error.message);
    // }
    
    // 2. Post a tweet
    // await bot.postTweet('Hello from my automated bot! 🚀');
    
    // 3. Just log activity
    // await bot.logActivity('Manual Test', 'Success', 'Testing logging functionality');
}

// Export for use in other files
module.exports = TwitterSheetsBot;

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}