import cron from 'node-cron';
import { TwitterService } from '../src/services/TwitterService';
import { ThreadService } from '../src/services/ThreadService';
import { MetricsService } from '../src/services/MetricsService';

export class ThreadScheduler {
  private twitterService: TwitterService;
  private threadService: ThreadService;

  constructor() {
    this.twitterService = new TwitterService();
    this.threadService = new ThreadService();
  }

  start() {
    // Check for scheduled threads every minute
    cron.schedule('* * * * *', async () => {
      await this.processScheduledThreads();
    });

    // Collect metrics every hour
    cron.schedule('0 * * * *', async () => {
      await this.collectMetrics();
    });

    console.log('📅 Thread scheduler started');
  }

  private async processScheduledThreads() {
    try {
      const scheduledThreads = await this.threadService.getScheduledThreads();
      
      for (const thread of scheduledThreads) {
        try {
          console.log(`📤 Publishing scheduled thread: ${thread.id}`);
          await this.publishThread(thread);
        } catch (error) {
          console.error(`❌ Failed to publish thread ${thread.id}:`, error);
          
          // Mark thread as failed
          await this.threadService.updateThread(thread.id, {
            status: 'failed'
          });
        }
      }
    } catch (error) {
      console.error('Error processing scheduled threads:', error);
    }
  }

  private async publishThread(thread: any) {
    try {
      // Parse content if it's a string
      const content = typeof thread.content === 'string' 
        ? JSON.parse(thread.content) 
        : thread.content;

      // Publish the thread to Twitter
      const tweetIds = await this.twitterService.publishThread(content);

      // Update thread status to published
      await this.threadService.updateThread(thread.id, {
        status: 'published',
        publishedTime: new Date()
      });

      console.log(`✅ Thread ${thread.id} published successfully with ${tweetIds.length} tweets`);
    } catch (error) {
      console.error(`❌ Error publishing thread ${thread.id}:`, error);
      throw error;
    }
  }

  private async collectMetrics() {
    try {
      console.log('📊 Collecting thread metrics...');
      
      // Get all published threads that need metrics update
      const publishedThreads = await this.threadService.getAllThreads();
      const threadsToUpdate = publishedThreads.filter(
        thread => thread.status === 'published' && thread.publishedTime
      );

      for (const thread of threadsToUpdate) {
        try {
          // This would need to be implemented with actual tweet IDs
          // For now, we'll skip actual metrics collection
          console.log(`📈 Would collect metrics for thread: ${thread.id}`);
        } catch (error) {
          console.error(`Failed to collect metrics for thread ${thread.id}:`, error);
        }
      }
      
      console.log(`📊 Metrics collection completed for ${threadsToUpdate.length} threads`);
    } catch (error) {
      console.error('Error collecting metrics:', error);
    }
  }
}