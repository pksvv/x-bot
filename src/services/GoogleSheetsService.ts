import { GoogleSpreadsheet, GoogleSpreadsheetWorksheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { ThreadData } from '../types';
import { ThreadService } from './ThreadService';

interface SheetRow {
  id?: string;
  tweet1?: string;
  tweet2?: string;
  tweet3?: string;
  tweet4?: string;
  tweet5?: string;
  tweet6?: string;
  tweet7?: string;
  tweet8?: string;
  tweet9?: string;
  tweet10?: string;
  scheduledTime?: string;
  status?: string;
  publishedTime?: string;
  notes?: string;
}

export class GoogleSheetsService {
  private doc?: GoogleSpreadsheet;
  private threadService: ThreadService;
  private serviceAccountAuth?: JWT;

  constructor() {
    this.threadService = new ThreadService();
  }

  private async initializeAuth(): Promise<JWT> {
    if (!this.serviceAccountAuth) {
      const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
      const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (!clientEmail || !privateKey) {
        throw new Error('Google Sheets credentials are not properly configured');
      }

      this.serviceAccountAuth = new JWT({
        email: clientEmail,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
    }

    return this.serviceAccountAuth;
  }

  private async getDocument(): Promise<GoogleSpreadsheet> {
    if (!this.doc) {
      const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
      if (!spreadsheetId) {
        throw new Error('Google Sheets spreadsheet ID is not configured');
      }

      const auth = await this.initializeAuth();
      this.doc = new GoogleSpreadsheet(spreadsheetId, auth);
      await this.doc.loadInfo();
    }

    return this.doc;
  }

  private async getOrCreateWorksheet(title: string = 'Threads'): Promise<GoogleSpreadsheetWorksheet> {
    const doc = await this.getDocument();
    
    let sheet = doc.sheetsByTitle[title];
    if (!sheet) {
      // Create new worksheet if it doesn't exist
      sheet = await doc.addSheet({
        title,
        headerValues: [
          'id',
          'tweet1',
          'tweet2', 
          'tweet3',
          'tweet4',
          'tweet5',
          'tweet6',
          'tweet7',
          'tweet8',
          'tweet9',
          'tweet10',
          'scheduledTime',
          'status',
          'publishedTime',
          'notes'
        ]
      });
    }

    return sheet;
  }

  private threadToSheetRow(thread: ThreadData): SheetRow {
    const row: SheetRow = {
      id: thread.id,
      status: thread.status,
      scheduledTime: thread.scheduledTime?.toISOString(),
      publishedTime: thread.publishedTime?.toISOString(),
    };

    // Map content array to individual tweet columns
    thread.content.forEach((tweet, index) => {
      if (index < 10) {
        const tweetKey = `tweet${index + 1}` as keyof SheetRow;
        (row as any)[tweetKey] = tweet;
      }
    });

    return row;
  }

  private sheetRowToThread(row: SheetRow): Partial<ThreadData> {
    const content: string[] = [];
    
    // Extract tweets from individual columns
    for (let i = 1; i <= 10; i++) {
      const tweetKey = `tweet${i}` as keyof SheetRow;
      const tweet = row[tweetKey];
      if (tweet && tweet.trim()) {
        content.push(tweet.trim());
      }
    }

    return {
      id: row.id,
      content,
      status: row.status as ThreadData['status'] || 'draft',
      scheduledTime: row.scheduledTime ? new Date(row.scheduledTime) : undefined,
      publishedTime: row.publishedTime ? new Date(row.publishedTime) : undefined,
    };
  }

  async syncFromDatabase(): Promise<void> {
    try {
      console.log('📊 Syncing threads from database to Google Sheets...');
      
      const sheet = await this.getOrCreateWorksheet();
      const threads = await this.threadService.getAllThreads();

      // Clear existing rows (except header)
      await sheet.clear('A2:Z');

      // Add all threads to sheet
      const rows = threads.map(thread => this.threadToSheetRow(thread));
      if (rows.length > 0) {
        await sheet.addRows(rows);
      }

      console.log(`✅ Synced ${threads.length} threads to Google Sheets`);
    } catch (error) {
      console.error('❌ Error syncing to Google Sheets:', error);
      throw error;
    }
  }

  async syncToDatabase(): Promise<void> {
    try {
      console.log('📥 Syncing threads from Google Sheets to database...');
      
      const sheet = await this.getOrCreateWorksheet();
      const rows = await sheet.getRows();

      let created = 0;
      let updated = 0;

      for (const row of rows) {
        try {
          const threadData = this.sheetRowToThread(row);
          
          if (!threadData.id || !threadData.content || threadData.content.length === 0) {
            console.log('⚠️ Skipping row with missing ID or content');
            continue;
          }

          // Check if thread exists in database
          const existingThread = await this.threadService.getThreadById(threadData.id);
          
          if (existingThread) {
            // Update existing thread
            await this.threadService.updateThread(threadData.id, threadData);
            updated++;
          } else {
            // Create new thread
            await this.threadService.createThread(threadData);
            created++;
          }
        } catch (error) {
          console.error(`❌ Error processing row:`, error);
        }
      }

      console.log(`✅ Synced from Google Sheets: ${created} created, ${updated} updated`);
    } catch (error) {
      console.error('❌ Error syncing from Google Sheets:', error);
      throw error;
    }
  }

  async addThreadToSheet(thread: ThreadData): Promise<void> {
    try {
      const sheet = await this.getOrCreateWorksheet();
      const row = this.threadToSheetRow(thread);
      await sheet.addRow(row);
      console.log(`✅ Added thread ${thread.id} to Google Sheets`);
    } catch (error) {
      console.error('❌ Error adding thread to Google Sheets:', error);
      throw error;
    }
  }

  async updateThreadInSheet(threadId: string, updates: Partial<ThreadData>): Promise<void> {
    try {
      const sheet = await this.getOrCreateWorksheet();
      const rows = await sheet.getRows();
      
      const rowIndex = rows.findIndex(row => row.get('id') === threadId);
      if (rowIndex === -1) {
        throw new Error(`Thread ${threadId} not found in Google Sheets`);
      }

      const row = rows[rowIndex];
      const updatedData = { ...this.sheetRowToThread(row), ...updates };
      const updatedRow = this.threadToSheetRow(updatedData as ThreadData);

      // Update row values
      Object.entries(updatedRow).forEach(([key, value]) => {
        if (value !== undefined) {
          row.set(key, value);
        }
      });

      await row.save();
      console.log(`✅ Updated thread ${threadId} in Google Sheets`);
    } catch (error) {
      console.error('❌ Error updating thread in Google Sheets:', error);
      throw error;
    }
  }

  async deleteThreadFromSheet(threadId: string): Promise<void> {
    try {
      const sheet = await this.getOrCreateWorksheet();
      const rows = await sheet.getRows();
      
      const rowIndex = rows.findIndex(row => row.get('id') === threadId);
      if (rowIndex === -1) {
        throw new Error(`Thread ${threadId} not found in Google Sheets`);
      }

      await rows[rowIndex].delete();
      console.log(`✅ Deleted thread ${threadId} from Google Sheets`);
    } catch (error) {
      console.error('❌ Error deleting thread from Google Sheets:', error);
      throw error;
    }
  }

  async getThreadsFromSheet(): Promise<ThreadData[]> {
    try {
      const sheet = await this.getOrCreateWorksheet();
      const rows = await sheet.getRows();
      
      const threads: ThreadData[] = [];
      for (const row of rows) {
        const threadData = this.sheetRowToThread(row);
        if (threadData.id && threadData.content && threadData.content.length > 0) {
          threads.push(threadData as ThreadData);
        }
      }

      return threads;
    } catch (error) {
      console.error('❌ Error getting threads from Google Sheets:', error);
      throw error;
    }
  }

  async validateConnection(): Promise<boolean> {
    try {
      const doc = await this.getDocument();
      console.log(`✅ Connected to Google Sheet: "${doc.title}"`);
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to Google Sheets:', error);
      return false;
    }
  }
}