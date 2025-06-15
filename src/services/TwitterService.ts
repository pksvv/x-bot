import { TwitterApi } from 'twitter-api-v2';
import { TwitterConfig } from '../types';

export class TwitterService {
  private client?: TwitterApi;

  constructor() {
    // Initialize client lazily to avoid errors during startup
  }

  private getClient(): TwitterApi {
    if (!this.client) {
      const config: TwitterConfig = {
        appKey: process.env.TWITTER_API_KEY || '',
        appSecret: process.env.TWITTER_API_SECRET || '',
        accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
        accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET || '',
      };

      if (!config.appKey || !config.appSecret || !config.accessToken || !config.accessSecret) {
        throw new Error('Twitter API credentials are not properly configured');
      }

      this.client = new TwitterApi({
        appKey: config.appKey,
        appSecret: config.appSecret,
        accessToken: config.accessToken,
        accessSecret: config.accessSecret,
      });
    }
    return this.client;
  }

  async publishThread(tweets: string[]): Promise<string[]> {
    const client = this.getClient();
    const tweetIds: string[] = [];
    let replyToId: string | undefined;

    for (const tweet of tweets) {
      try {
        const tweetPayload: any = { text: tweet };
        if (replyToId) {
          tweetPayload.reply = { in_reply_to_tweet_id: replyToId };
        }

        const response = await client.v2.tweet(tweetPayload);
        tweetIds.push(response.data.id);
        replyToId = response.data.id;
      } catch (error) {
        console.error('Error publishing tweet:', error);
        throw error;
      }
    }

    return tweetIds;
  }

  async getTweetMetrics(tweetId: string) {
    try {
      const client = this.getClient();
      const tweet = await client.v2.singleTweet(tweetId, {
        'tweet.fields': ['public_metrics', 'non_public_metrics'],
      });

      return tweet.data?.public_metrics;
    } catch (error) {
      console.error('Error fetching tweet metrics:', error);
      throw error;
    }
  }
}