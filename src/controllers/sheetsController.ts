import { Request, Response } from 'express';
import { GoogleSheetsService } from '../services/GoogleSheetsService';

export class SheetsController {
  private sheetsService: GoogleSheetsService;

  constructor() {
    this.sheetsService = new GoogleSheetsService();
  }

  // POST /api/sheets/sync-from-db
  async syncFromDatabase(req: Request, res: Response) {
    try {
      await this.sheetsService.syncFromDatabase();
      return res.json({ 
        success: true, 
        message: 'Successfully synced threads from database to Google Sheets' 
      });
    } catch (error) {
      console.error('Error syncing from database:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to sync from database to Google Sheets' 
      });
    }
  }

  // POST /api/sheets/sync-to-db
  async syncToDatabase(req: Request, res: Response) {
    try {
      await this.sheetsService.syncToDatabase();
      return res.json({ 
        success: true, 
        message: 'Successfully synced threads from Google Sheets to database' 
      });
    } catch (error) {
      console.error('Error syncing to database:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to sync from Google Sheets to database' 
      });
    }
  }

  // GET /api/sheets/threads
  async getThreadsFromSheet(req: Request, res: Response) {
    try {
      const threads = await this.sheetsService.getThreadsFromSheet();
      return res.json({ 
        success: true, 
        data: threads,
        count: threads.length 
      });
    } catch (error) {
      console.error('Error getting threads from sheet:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to get threads from Google Sheets' 
      });
    }
  }

  // GET /api/sheets/validate
  async validateConnection(req: Request, res: Response) {
    try {
      const isValid = await this.sheetsService.validateConnection();
      return res.json({ 
        success: true, 
        connected: isValid,
        message: isValid ? 'Google Sheets connection is valid' : 'Google Sheets connection failed'
      });
    } catch (error) {
      console.error('Error validating connection:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to validate Google Sheets connection' 
      });
    }
  }

  // POST /api/sheets/bidirectional-sync
  async bidirectionalSync(req: Request, res: Response) {
    try {
      console.log('🔄 Starting bidirectional sync...');
      
      // First sync from database to sheets (to ensure sheets has latest)
      await this.sheetsService.syncFromDatabase();
      
      // Then sync any new/updated items from sheets back to database
      await this.sheetsService.syncToDatabase();
      
      return res.json({ 
        success: true, 
        message: 'Successfully completed bidirectional sync between database and Google Sheets' 
      });
    } catch (error) {
      console.error('Error in bidirectional sync:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to complete bidirectional sync' 
      });
    }
  }
}