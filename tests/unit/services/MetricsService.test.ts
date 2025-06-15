import { MetricsService } from '../../../src/services/MetricsService';
import { TwitterService } from '../../../src/services/TwitterService';
import { TestDatabase } from '../../helpers/database.helper';
import { MockHelper } from '../../helpers/mock.helper';

// Mock TwitterService
jest.mock('../../../src/services/TwitterService');
const MockedTwitterService = TwitterService as jest.MockedClass<typeof TwitterService>;

// Mock database
jest.mock('../../../config/database', () => ({
  db: null
}));

describe('MetricsService', () => {
  let metricsService: MetricsService;
  let twitterService: jest.Mocked<TwitterService>;
  let testDb: TestDatabase;

  beforeEach(async () => {
    testDb = new TestDatabase();
    await testDb.initialize();
    
    // Mock the database import
    const dbModule = require('../../../config/database');
    dbModule.db = testDb.getDatabase();
    
    twitterService = new MockedTwitterService() as jest.Mocked<TwitterService>;
    metricsService = new MetricsService();
    (metricsService as any).twitterService = twitterService;
  });

  afterEach(async () => {
    await testDb.cleanup();
    jest.clearAllMocks();
  });

  describe('Metrics Collection', () => {
    let testThread: any;

    beforeEach(async () => {
      testThread = await testDb.createTestThread({
        tweet_ids: JSON.stringify(['1234567890', '1234567891']),
        status: 'published'
      });
    });

    it('should collect metrics for a thread successfully', async () => {
      const mockMetrics = [
        {
          tweetId: '1234567890',
          views: 100,
          likes: 10,
          retweets: 5,
          replies: 3,
          impressions: 200,
          engagementRate: 0.09
        },
        {
          tweetId: '1234567891',
          views: 80,
          likes: 8,
          retweets: 3,
          replies: 2,
          impressions: 150,
          engagementRate: 0.087
        }
      ];

      twitterService.getThreadMetrics.mockResolvedValue(mockMetrics);

      const result = await metricsService.collectMetricsForThread(testThread.id);

      expect(twitterService.getThreadMetrics).toHaveBeenCalledWith(['1234567890', '1234567891']);
      expect(result.success).toBe(true);
      expect(result.metricsCollected).toBe(2);
      expect(result.metrics).toEqual(mockMetrics);
    });

    it('should handle threads without tweet IDs', async () => {
      const threadWithoutTweets = await testDb.createTestThread({
        tweet_ids: null,
        status: 'draft'
      });

      const result = await metricsService.collectMetricsForThread(threadWithoutTweets.id);

      expect(result.success).toBe(false);
      expect(result.error).toContain('not published');
      expect(twitterService.getThreadMetrics).not.toHaveBeenCalled();
    });

    it('should handle Twitter API errors gracefully', async () => {
      const error = new Error('Twitter API rate limit exceeded');
      twitterService.getThreadMetrics.mockRejectedValue(error);

      const result = await metricsService.collectMetricsForThread(testThread.id);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Twitter API rate limit exceeded');
    });

    it('should store metrics in database', async () => {
      const mockMetrics = [{
        tweetId: '1234567890',
        views: 100,
        likes: 10,
        retweets: 5,
        replies: 3,
        impressions: 200,
        engagementRate: 0.09
      }];

      twitterService.getThreadMetrics.mockResolvedValue(mockMetrics);

      await metricsService.collectMetricsForThread(testThread.id);

      // Verify metrics were stored in database
      const storedMetrics = await metricsService.getThreadMetrics(testThread.id);
      expect(storedMetrics).toBeDefined();
      expect(storedMetrics.views).toBe(100);
      expect(storedMetrics.likes).toBe(10);
    });
  });

  describe('Metrics Retrieval', () => {
    beforeEach(async () => {
      // Create test data
      const thread1 = await testDb.createTestThread({ id: 'thread-1' });
      const thread2 = await testDb.createTestThread({ id: 'thread-2' });
      
      await testDb.createTestMetrics({
        thread_id: 'thread-1',
        views: 100,
        likes: 10,
        retweets: 5,
        replies: 3,
        impressions: 200,
        engagement_rate: 0.09
      });
      
      await testDb.createTestMetrics({
        thread_id: 'thread-2',
        views: 150,
        likes: 15,
        retweets: 8,
        replies: 5,
        impressions: 300,
        engagement_rate: 0.12
      });
    });

    it('should get metrics for specific thread', async () => {
      const metrics = await metricsService.getThreadMetrics('thread-1');

      expect(metrics).toBeDefined();
      expect(metrics.views).toBe(100);
      expect(metrics.likes).toBe(10);
      expect(metrics.retweets).toBe(5);
      expect(metrics.replies).toBe(3);
      expect(metrics.impressions).toBe(200);
      expect(metrics.engagementRate).toBeCloseTo(0.09);
    });

    it('should return null for non-existent thread', async () => {
      const metrics = await metricsService.getThreadMetrics('non-existent');

      expect(metrics).toBeNull();
    });

    it('should get metrics summary', async () => {
      const summary = await metricsService.getMetricsSummary();

      expect(summary).toBeDefined();
      expect(summary.totalThreads).toBe(2);
      expect(summary.totalViews).toBe(250); // 100 + 150
      expect(summary.totalLikes).toBe(25);  // 10 + 15
      expect(summary.totalRetweets).toBe(13); // 5 + 8
      expect(summary.totalReplies).toBe(8);   // 3 + 5
      expect(summary.averageEngagementRate).toBeCloseTo(0.105); // (0.09 + 0.12) / 2
    });

    it('should get top performing threads', async () => {
      const topThreads = await metricsService.getTopPerformingThreads(1);

      expect(topThreads).toHaveLength(1);
      expect(topThreads[0].threadId).toBe('thread-2'); // Higher engagement rate
      expect(topThreads[0].engagementRate).toBeCloseTo(0.12);
    });

    it('should limit results for top performing threads', async () => {
      const topThreads = await metricsService.getTopPerformingThreads(5);

      expect(topThreads).toHaveLength(2); // Only 2 threads exist
    });
  });

  describe('Metrics History', () => {
    beforeEach(async () => {
      const thread = await testDb.createTestThread({ id: 'history-thread' });
      
      // Create metrics at different times
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
      
      await testDb.createTestMetrics({
        thread_id: 'history-thread',
        views: 50,
        likes: 5,
        retweets: 2,
        replies: 1,
        impressions: 100,
        engagement_rate: 0.08
      });
      
      await testDb.createTestMetrics({
        thread_id: 'history-thread',
        views: 75,
        likes: 8,
        retweets: 3,
        replies: 2,
        impressions: 150,
        engagement_rate: 0.087
      });
    });

    it('should get metrics history for thread', async () => {
      const history = await metricsService.getThreadMetricsHistory('history-thread');

      expect(history).toHaveLength(2);
      expect(history[0].views).toBe(50);
      expect(history[1].views).toBe(75);
    });

    it('should return empty array for thread without history', async () => {
      const history = await metricsService.getThreadMetricsHistory('no-history');

      expect(history).toHaveLength(0);
    });
  });

  describe('Bulk Operations', () => {
    beforeEach(async () => {
      // Create multiple published threads
      await testDb.createTestThread({
        id: 'bulk-1',
        tweet_ids: JSON.stringify(['111', '112']),
        status: 'published'
      });
      
      await testDb.createTestThread({
        id: 'bulk-2',
        tweet_ids: JSON.stringify(['221', '222']),
        status: 'published'
      });
      
      await testDb.createTestThread({
        id: 'bulk-3',
        tweet_ids: null,
        status: 'draft'
      });
    });

    it('should collect metrics for all published threads', async () => {
      const mockMetrics = [
        { tweetId: '111', views: 100, likes: 10, retweets: 5, replies: 3, impressions: 200, engagementRate: 0.09 },
        { tweetId: '112', views: 80, likes: 8, retweets: 3, replies: 2, impressions: 150, engagementRate: 0.087 }
      ];
      
      twitterService.getThreadMetrics.mockResolvedValue(mockMetrics);

      const result = await metricsService.collectMetricsForAllThreads();

      expect(result.success).toBe(true);
      expect(result.threadsProcessed).toBe(2); // Only published threads
      expect(result.successfulCollections).toBe(2);
      expect(result.failedCollections).toBe(0);
      expect(twitterService.getThreadMetrics).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures in bulk collection', async () => {
      twitterService.getThreadMetrics
        .mockResolvedValueOnce([{ tweetId: '111', views: 100, likes: 10, retweets: 5, replies: 3, impressions: 200, engagementRate: 0.09 }])
        .mockRejectedValueOnce(new Error('API error'));

      const result = await metricsService.collectMetricsForAllThreads();

      expect(result.success).toBe(true);
      expect(result.threadsProcessed).toBe(2);
      expect(result.successfulCollections).toBe(1);
      expect(result.failedCollections).toBe(1);
    });
  });

  describe('Engagement Rate Calculation', () => {
    it('should calculate engagement rate correctly', () => {
      const metrics = {
        likes: 10,
        retweets: 5,
        replies: 3,
        impressions: 100
      };

      const engagementRate = (metricsService as any).calculateEngagementRate(metrics);

      expect(engagementRate).toBeCloseTo(0.18); // (10 + 5 + 3) / 100
    });

    it('should handle zero impressions', () => {
      const metrics = {
        likes: 10,
        retweets: 5,
        replies: 3,
        impressions: 0
      };

      const engagementRate = (metricsService as any).calculateEngagementRate(metrics);

      expect(engagementRate).toBe(0);
    });

    it('should handle missing engagement data', () => {
      const metrics = {
        impressions: 100
      };

      const engagementRate = (metricsService as any).calculateEngagementRate(metrics);

      expect(engagementRate).toBe(0);
    });
  });

  describe('Data Aggregation', () => {
    beforeEach(async () => {
      // Create test data across multiple threads
      const threads = ['agg-1', 'agg-2', 'agg-3'];
      
      for (let i = 0; i < threads.length; i++) {
        await testDb.createTestThread({ id: threads[i] });
        await testDb.createTestMetrics({
          thread_id: threads[i],
          views: (i + 1) * 100,
          likes: (i + 1) * 10,
          retweets: (i + 1) * 5,
          replies: (i + 1) * 3,
          impressions: (i + 1) * 200,
          engagement_rate: 0.08 + (i * 0.01)
        });
      }
    });

    it('should aggregate metrics correctly', async () => {
      const summary = await metricsService.getMetricsSummary();

      expect(summary.totalThreads).toBe(3);
      expect(summary.totalViews).toBe(600);   // 100 + 200 + 300
      expect(summary.totalLikes).toBe(60);    // 10 + 20 + 30
      expect(summary.totalRetweets).toBe(30); // 5 + 10 + 15
      expect(summary.totalReplies).toBe(18);  // 3 + 6 + 9
      expect(summary.averageEngagementRate).toBeCloseTo(0.09); // (0.08 + 0.09 + 0.10) / 3
    });
  });
});