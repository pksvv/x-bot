import { TwitterService } from './TwitterService';
import { ThreadService } from './ThreadService';
import { ThreadMetrics, ThreadData } from '../types';

export class MetricsService {
  private twitterService: TwitterService;
  private threadService: ThreadService;

  constructor() {
    this.twitterService = new TwitterService();
    this.threadService = new ThreadService();
  }

  async collectMetricsForThread(threadId: string): Promise<ThreadMetrics | null> {
    try {
      const thread = await this.threadService.getThreadById(threadId);
      if (!thread || !thread.tweetIds || thread.tweetIds.length === 0) {
        console.log(`⚠️ No tweet IDs found for thread ${threadId}`);
        return null;
      }

      console.log(`📊 Collecting metrics for thread ${threadId} with ${thread.tweetIds.length} tweets`);

      let totalMetrics: ThreadMetrics = {
        views: 0,
        likes: 0,
        retweets: 0,
        replies: 0,
        impressions: 0,
        engagementRate: 0
      };

      // Collect metrics for each tweet in the thread
      for (const tweetId of thread.tweetIds) {
        try {
          const tweetMetrics = await this.twitterService.getTweetMetrics(tweetId);
          if (tweetMetrics) {
            totalMetrics.views += tweetMetrics.impression_count || 0;
            totalMetrics.likes += tweetMetrics.like_count || 0;
            totalMetrics.retweets += tweetMetrics.retweet_count || 0;
            totalMetrics.replies += tweetMetrics.reply_count || 0;
            totalMetrics.impressions += tweetMetrics.impression_count || 0;
          }
        } catch (error) {
          console.error(`❌ Error collecting metrics for tweet ${tweetId}:`, error);
        }
      }

      // Calculate engagement rate
      if (totalMetrics.impressions > 0) {
        const totalEngagements = totalMetrics.likes + totalMetrics.retweets + totalMetrics.replies;
        totalMetrics.engagementRate = (totalEngagements / totalMetrics.impressions) * 100;
      }

      // Save metrics to database
      await this.threadService.saveThreadMetrics(threadId, totalMetrics);

      console.log(`✅ Collected metrics for thread ${threadId}:`, totalMetrics);
      return totalMetrics;
    } catch (error) {
      console.error(`❌ Error collecting metrics for thread ${threadId}:`, error);
      return null;
    }
  }

  async collectMetricsForAllPublishedThreads(): Promise<void> {
    try {
      console.log('📊 Starting metrics collection for all published threads...');

      const allThreads = await this.threadService.getAllThreads();
      const publishedThreads = allThreads.filter(
        thread => thread.status === 'published' && thread.tweetIds && thread.tweetIds.length > 0
      );

      console.log(`Found ${publishedThreads.length} published threads with tweet IDs`);

      let successCount = 0;
      let errorCount = 0;

      for (const thread of publishedThreads) {
        try {
          await this.collectMetricsForThread(thread.id);
          successCount++;
          
          // Add a small delay to avoid rate limiting
          await this.delay(1000);
        } catch (error) {
          console.error(`Failed to collect metrics for thread ${thread.id}:`, error);
          errorCount++;
        }
      }

      console.log(`✅ Metrics collection completed: ${successCount} success, ${errorCount} errors`);
    } catch (error) {
      console.error('❌ Error in metrics collection process:', error);
    }
  }

  async getMetricsSummary(): Promise<{
    totalThreads: number;
    publishedThreads: number;
    totalViews: number;
    totalLikes: number;
    totalRetweets: number;
    totalReplies: number;
    averageEngagementRate: number;
  }> {
    try {
      const allThreads = await this.threadService.getAllThreads();
      const publishedThreads = allThreads.filter(thread => thread.status === 'published');

      let totalViews = 0;
      let totalLikes = 0;
      let totalRetweets = 0;
      let totalReplies = 0;
      let totalEngagementRate = 0;
      let threadsWithMetrics = 0;

      for (const thread of publishedThreads) {
        const metrics = await this.threadService.getThreadMetrics(thread.id);
        if (metrics) {
          totalViews += metrics.views;
          totalLikes += metrics.likes;
          totalRetweets += metrics.retweets;
          totalReplies += metrics.replies;
          totalEngagementRate += metrics.engagementRate;
          threadsWithMetrics++;
        }
      }

      return {
        totalThreads: allThreads.length,
        publishedThreads: publishedThreads.length,
        totalViews,
        totalLikes,
        totalRetweets,
        totalReplies,
        averageEngagementRate: threadsWithMetrics > 0 ? totalEngagementRate / threadsWithMetrics : 0
      };
    } catch (error) {
      console.error('❌ Error generating metrics summary:', error);
      throw error;
    }
  }

  async getTopPerformingThreads(limit: number = 10): Promise<Array<ThreadData & { metrics: ThreadMetrics }>> {
    try {
      const allThreads = await this.threadService.getAllThreads();
      const threadsWithMetrics: Array<ThreadData & { metrics: ThreadMetrics }> = [];

      for (const thread of allThreads) {
        if (thread.status === 'published') {
          const metrics = await this.threadService.getThreadMetrics(thread.id);
          if (metrics) {
            threadsWithMetrics.push({ ...thread, metrics });
          }
        }
      }

      // Sort by engagement rate descending
      threadsWithMetrics.sort((a, b) => b.metrics.engagementRate - a.metrics.engagementRate);

      return threadsWithMetrics.slice(0, limit);
    } catch (error) {
      console.error('❌ Error getting top performing threads:', error);
      throw error;
    }
  }

  async getMetricsHistory(threadId: string, days: number = 30): Promise<Array<{
    date: string;
    metrics: ThreadMetrics;
  }>> {
    try {
      // This would be implemented with a more sophisticated metrics history table
      // For now, return the latest metrics
      const metrics = await this.threadService.getThreadMetrics(threadId);
      if (!metrics) {
        return [];
      }

      return [{
        date: new Date().toISOString().split('T')[0],
        metrics
      }];
    } catch (error) {
      console.error('❌ Error getting metrics history:', error);
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async scheduleMetricsCollection(): Promise<void> {
    console.log('🕐 Scheduling metrics collection...');
    
    // Collect metrics for threads published in the last 7 days
    const allThreads = await this.threadService.getAllThreads();
    const recentThreads = allThreads.filter(thread => {
      if (thread.status !== 'published' || !thread.publishedTime) return false;
      
      const daysSincePublished = (Date.now() - thread.publishedTime.getTime()) / (1000 * 60 * 60 * 24);
      return daysSincePublished <= 7;
    });

    console.log(`Found ${recentThreads.length} threads published in the last 7 days`);

    for (const thread of recentThreads) {
      if (thread.tweetIds && thread.tweetIds.length > 0) {
        await this.collectMetricsForThread(thread.id);
        await this.delay(2000); // 2 second delay between requests
      }
    }
  }
}