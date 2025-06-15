import cron from 'node-cron';
import { TwitterService } from '../src/services/TwitterService';
import { ThreadService } from '../src/services/ThreadService';
import { MetricsService } from '../src/services/MetricsService';

export class ThreadScheduler {
  private twitterService: TwitterService;
  private threadService: ThreadService;
  private metricsService: MetricsService;

  constructor() {
    this.twitterService = new TwitterService();
    this.threadService = new ThreadService();
    this.metricsService = new MetricsService();
  }

  start() {
    // Check for scheduled threads every minute
    cron.schedule('* * * * *', async () => {
      await this.processScheduledThreads();
    });

    // Collect metrics every 2 hours
    cron.schedule('0 */2 * * *', async () => {
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
        publishedTime: new Date(),
        tweetIds: tweetIds
      });

      console.log(`✅ Thread ${thread.id} published successfully with ${tweetIds.length} tweets`);
    } catch (error) {
      console.error(`❌ Error publishing thread ${thread.id}:`, error);
      throw error;
    }
  }

  private async collectMetrics() {
    try {
      console.log('📊 Starting scheduled metrics collection...');
      await this.metricsService.scheduleMetricsCollection();
      console.log('✅ Scheduled metrics collection completed');
    } catch (error) {
      console.error('❌ Error in scheduled metrics collection:', error);
    }
  }

  stop(): void {
    console.log('🛑 Stopping thread scheduler...');
    if (this.publishingJob) {
      this.publishingJob.stop();
    }
    if (this.metricsJob) {
      this.metricsJob.stop();
    }
    console.log('✅ Thread scheduler stopped');
  }
}