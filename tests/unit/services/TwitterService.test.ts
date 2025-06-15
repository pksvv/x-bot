import { TwitterService } from '../../../src/services/TwitterService';
import { MockHelper } from '../../helpers/mock.helper';

// Mock TwitterApi
jest.mock('twitter-api-v2', () => ({
  TwitterApi: jest.fn().mockImplementation(() => MockHelper.mockTwitterClient())
}));

describe('TwitterService', () => {
  let twitterService: TwitterService;
  let mockTwitterClient: any;

  beforeEach(() => {
    mockTwitterClient = MockHelper.mockTwitterClient();
    twitterService = new TwitterService();
    (twitterService as any).client = mockTwitterClient;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Tweet Publishing', () => {
    it('should publish a single tweet successfully', async () => {
      const tweetText = 'Test tweet content';
      const expectedResponse = {
        data: {
          id: '1234567890',
          text: tweetText
        }
      };

      mockTwitterClient.v2.tweet.mockResolvedValue(expectedResponse);

      const result = await twitterService.publishTweet(tweetText);

      expect(mockTwitterClient.v2.tweet).toHaveBeenCalledWith(tweetText);
      expect(result).toEqual(expectedResponse.data);
    });

    it('should handle tweet publishing errors', async () => {
      const tweetText = 'Test tweet content';
      const error = new Error('Twitter API error');

      mockTwitterClient.v2.tweet.mockRejectedValue(error);

      await expect(twitterService.publishTweet(tweetText)).rejects.toThrow('Twitter API error');
    });

    it('should publish a thread successfully', async () => {
      const threadContent = [
        'First tweet in thread',
        'Second tweet in thread',
        'Third tweet in thread'
      ];

      const expectedResponse = {
        data: [
          { id: '1234567890', text: threadContent[0] },
          { id: '1234567891', text: threadContent[1] },
          { id: '1234567892', text: threadContent[2] }
        ]
      };

      mockTwitterClient.v2.tweetThread.mockResolvedValue(expectedResponse);

      const result = await twitterService.publishThread(threadContent);

      expect(mockTwitterClient.v2.tweetThread).toHaveBeenCalledWith(threadContent);
      expect(result).toEqual(expectedResponse.data);
      expect(result).toHaveLength(3);
    });

    it('should handle thread publishing errors', async () => {
      const threadContent = ['Tweet 1', 'Tweet 2'];
      const error = new Error('Thread publishing failed');

      mockTwitterClient.v2.tweetThread.mockRejectedValue(error);

      await expect(twitterService.publishThread(threadContent)).rejects.toThrow('Thread publishing failed');
    });

    it('should reject empty thread content', async () => {
      await expect(twitterService.publishThread([])).rejects.toThrow('Thread content cannot be empty');
    });
  });

  describe('Tweet Metrics Collection', () => {
    it('should collect metrics for single tweet successfully', async () => {
      const tweetId = '1234567890';
      const expectedResponse = {
        data: [{
          id: tweetId,
          text: 'Test tweet',
          public_metrics: {
            retweet_count: 5,
            like_count: 10,
            reply_count: 3,
            quote_count: 1,
            impression_count: 200
          }
        }]
      };

      mockTwitterClient.v2.tweets.mockResolvedValue(expectedResponse);

      const metrics = await twitterService.getTweetMetrics(tweetId);

      expect(mockTwitterClient.v2.tweets).toHaveBeenCalledWith(
        [tweetId],
        {
          'tweet.fields': ['public_metrics']
        }
      );
      
      expect(metrics).toEqual({
        views: 200,
        likes: 10,
        retweets: 5,
        replies: 3,
        impressions: 200,
        engagementRate: expect.any(Number)
      });
    });

    it('should collect metrics for multiple tweets successfully', async () => {
      const tweetIds = ['1234567890', '1234567891'];
      const expectedResponse = {
        data: [
          {
            id: '1234567890',
            public_metrics: {
              retweet_count: 5,
              like_count: 10,
              reply_count: 3,
              quote_count: 1,
              impression_count: 200
            }
          },
          {
            id: '1234567891',
            public_metrics: {
              retweet_count: 2,
              like_count: 8,
              reply_count: 1,
              quote_count: 0,
              impression_count: 150
            }
          }
        ]
      };

      mockTwitterClient.v2.tweets.mockResolvedValue(expectedResponse);

      const metricsArray = await twitterService.getThreadMetrics(tweetIds);

      expect(mockTwitterClient.v2.tweets).toHaveBeenCalledWith(
        tweetIds,
        {
          'tweet.fields': ['public_metrics']
        }
      );
      
      expect(metricsArray).toHaveLength(2);
      expect(metricsArray[0]).toEqual({
        tweetId: '1234567890',
        views: 200,
        likes: 10,
        retweets: 5,
        replies: 3,
        impressions: 200,
        engagementRate: expect.any(Number)
      });
    });

    it('should handle metrics collection errors', async () => {
      const tweetId = '1234567890';
      const error = new Error('Metrics collection failed');

      mockTwitterClient.v2.tweets.mockRejectedValue(error);

      await expect(twitterService.getTweetMetrics(tweetId)).rejects.toThrow('Metrics collection failed');
    });

    it('should calculate engagement rate correctly', async () => {
      const tweetId = '1234567890';
      const expectedResponse = {
        data: [{
          id: tweetId,
          public_metrics: {
            retweet_count: 10,
            like_count: 20,
            reply_count: 5,
            quote_count: 3,
            impression_count: 1000
          }
        }]
      };

      mockTwitterClient.v2.tweets.mockResolvedValue(expectedResponse);

      const metrics = await twitterService.getTweetMetrics(tweetId);

      // Engagement rate = (likes + retweets + replies + quotes) / impressions
      // (20 + 10 + 5 + 3) / 1000 = 0.038 = 3.8%
      expect(metrics.engagementRate).toBeCloseTo(0.038, 3);
    });

    it('should handle zero impressions in engagement rate calculation', async () => {
      const tweetId = '1234567890';
      const expectedResponse = {
        data: [{
          id: tweetId,
          public_metrics: {
            retweet_count: 1,
            like_count: 2,
            reply_count: 1,
            quote_count: 0,
            impression_count: 0
          }
        }]
      };

      mockTwitterClient.v2.tweets.mockResolvedValue(expectedResponse);

      const metrics = await twitterService.getTweetMetrics(tweetId);

      expect(metrics.engagementRate).toBe(0);
    });
  });

  describe('Service Configuration', () => {
    it('should initialize with provided configuration', () => {
      const config = {
        appKey: 'test-app-key',
        appSecret: 'test-app-secret',
        accessToken: 'test-access-token',
        accessSecret: 'test-access-secret'
      };

      const service = new TwitterService(config);
      
      // Verify service was created (constructor doesn't throw)
      expect(service).toBeInstanceOf(TwitterService);
    });

    it('should initialize with environment variables', () => {
      // Test that service can be created without explicit config
      const service = new TwitterService();
      
      expect(service).toBeInstanceOf(TwitterService);
    });
  });

  describe('Error Handling', () => {
    it('should handle rate limiting errors', async () => {
      const error = new Error('Rate limit exceeded');
      error.code = 429;

      mockTwitterClient.v2.tweet.mockRejectedValue(error);

      await expect(twitterService.publishTweet('Test')).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle authentication errors', async () => {
      const error = new Error('Unauthorized');
      error.code = 401;

      mockTwitterClient.v2.tweet.mockRejectedValue(error);

      await expect(twitterService.publishTweet('Test')).rejects.toThrow('Unauthorized');
    });

    it('should handle network errors', async () => {
      const error = new Error('Network error');
      error.code = 'ECONNREFUSED';

      mockTwitterClient.v2.tweet.mockRejectedValue(error);

      await expect(twitterService.publishTweet('Test')).rejects.toThrow('Network error');
    });
  });
});