import cron from 'node-cron';
import { GoogleSheetsService } from '../src/services/GoogleSheetsService';

export class SheetsSync {
  private sheetsService: GoogleSheetsService;

  constructor() {
    this.sheetsService = new GoogleSheetsService();
  }

  start() {
    // Auto-sync with Google Sheets every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      await this.performBidirectionalSync();
    });

    console.log('📊 Google Sheets auto-sync started (every 5 minutes)');
  }

  private async performBidirectionalSync() {
    try {
      // Check if Google Sheets is configured
      const isConnected = await this.sheetsService.validateConnection();
      if (!isConnected) {
        console.log('⚠️ Google Sheets not configured, skipping sync');
        return;
      }

      console.log('🔄 Starting automatic bidirectional sync...');

      // Sync from database to sheets (to ensure sheets has latest)
      await this.sheetsService.syncFromDatabase();

      // Sync any new/updated items from sheets back to database
      await this.sheetsService.syncToDatabase();

      console.log('✅ Automatic bidirectional sync completed');
    } catch (error) {
      console.error('❌ Error in automatic sync:', error);
    }
  }

  async manualSync() {
    return this.performBidirectionalSync();
  }

  stop(): void {
    console.log('🛑 Stopping Google Sheets sync...');
    if (this.syncJob) {
      this.syncJob.stop();
    }
    console.log('✅ Google Sheets sync stopped');
  }
}