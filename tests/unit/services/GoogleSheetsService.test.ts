import { GoogleSheetsService } from '../../../src/services/GoogleSheetsService';
import { MockHelper } from '../../helpers/mock.helper';

// Mock Google APIs
jest.mock('googleapis', () => ({
  google: {
    auth: {
      JWT: jest.fn().mockImplementation(() => ({
        authorize: jest.fn().mockResolvedValue(true)
      }))
    },
    sheets: jest.fn().mockImplementation(() => MockHelper.mockGoogleSheets())
  }
}));

describe('GoogleSheetsService', () => {
  let sheetsService: GoogleSheetsService;
  let mockSheetsApi: any;

  beforeEach(() => {
    mockSheetsApi = MockHelper.mockGoogleSheets();
    sheetsService = new GoogleSheetsService();
    (sheetsService as any).sheets = mockSheetsApi;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should initialize with provided configuration', () => {
      const config = {
        clientEmail: 'test@test.iam.gserviceaccount.com',
        privateKey: 'test-private-key',
        spreadsheetId: 'test-spreadsheet-id'
      };

      const service = new GoogleSheetsService(config);
      
      expect(service).toBeInstanceOf(GoogleSheetsService);
    });

    it('should initialize with environment variables', () => {
      const service = new GoogleSheetsService();
      
      expect(service).toBeInstanceOf(GoogleSheetsService);
    });
  });

  describe('Data Reading', () => {
    it('should read threads from spreadsheet successfully', async () => {
      const mockData = {
        data: {
          values: [
            ['ID', 'Content', 'Status', 'Published Time', 'Views', 'Likes', 'Retweets', 'Replies'],
            ['thread-1', 'First thread content', 'published', '2024-01-01T10:00:00Z', '100', '10', '5', '3'],
            ['thread-2', 'Second thread content', 'draft', '', '0', '0', '0', '0']
          ]
        }
      };

      mockSheetsApi.spreadsheets.values.get.mockResolvedValue(mockData);

      const threads = await sheetsService.getThreadsFromSheet();

      expect(mockSheetsApi.spreadsheets.values.get).toHaveBeenCalledWith({
        spreadsheetId: expect.any(String),
        range: 'A:H'
      });

      expect(threads).toHaveLength(2);
      expect(threads[0]).toEqual({
        id: 'thread-1',
        content: ['First thread content'],
        status: 'published',
        publishedTime: new Date('2024-01-01T10:00:00Z'),
        metrics: {
          views: 100,
          likes: 10,
          retweets: 5,
          replies: 3,
          impressions: 100,
          engagementRate: expect.any(Number)
        }
      });
    });

    it('should handle empty spreadsheet', async () => {
      const mockData = {
        data: {
          values: [
            ['ID', 'Content', 'Status', 'Published Time', 'Views', 'Likes', 'Retweets', 'Replies']
          ]
        }
      };

      mockSheetsApi.spreadsheets.values.get.mockResolvedValue(mockData);

      const threads = await sheetsService.getThreadsFromSheet();

      expect(threads).toHaveLength(0);
    });

    it('should handle missing spreadsheet data', async () => {
      const mockData = {
        data: {}
      };

      mockSheetsApi.spreadsheets.values.get.mockResolvedValue(mockData);

      const threads = await sheetsService.getThreadsFromSheet();

      expect(threads).toHaveLength(0);
    });
  });

  describe('Data Writing', () => {
    it('should sync threads to spreadsheet successfully', async () => {
      const threads = [
        {
          id: 'thread-1',
          content: ['First thread'],
          status: 'published',
          publishedTime: new Date('2024-01-01T10:00:00Z'),
          metrics: {
            views: 100,
            likes: 10,
            retweets: 5,
            replies: 3
          }
        },
        {
          id: 'thread-2',
          content: ['Second thread'],
          status: 'draft',
          publishedTime: null,
          metrics: null
        }
      ];

      mockSheetsApi.spreadsheets.values.update.mockResolvedValue({
        data: { updatedCells: threads.length + 1 }
      });

      const result = await sheetsService.syncThreadsToSheet(threads);

      expect(mockSheetsApi.spreadsheets.values.update).toHaveBeenCalledWith({
        spreadsheetId: expect.any(String),
        range: 'A:H',
        valueInputOption: 'RAW',
        resource: {
          values: expect.arrayContaining([
            ['ID', 'Content', 'Status', 'Published Time', 'Views', 'Likes', 'Retweets', 'Replies'],
            ['thread-1', 'First thread', 'published', '2024-01-01T10:00:00.000Z', 100, 10, 5, 3],
            ['thread-2', 'Second thread', 'draft', '', 0, 0, 0, 0]
          ])
        }
      });

      expect(result.success).toBe(true);
      expect(result.updatedRows).toBe(threads.length + 1);
    });

    it('should handle write errors gracefully', async () => {
      const threads = [
        {
          id: 'thread-1',
          content: ['Test thread'],
          status: 'draft'
        }
      ];

      const error = new Error('Sheets API error');
      mockSheetsApi.spreadsheets.values.update.mockRejectedValue(error);

      await expect(sheetsService.syncThreadsToSheet(threads)).rejects.toThrow('Sheets API error');
    });
  });

  describe('Bidirectional Sync', () => {
    it('should perform bidirectional sync successfully', async () => {
      const localThreads = [
        {
          id: 'thread-1',
          content: ['Local thread'],
          status: 'published',
          metrics: { views: 50, likes: 5, retweets: 2, replies: 1 }
        }
      ];

      const sheetData = {
        data: {
          values: [
            ['ID', 'Content', 'Status', 'Published Time', 'Views', 'Likes', 'Retweets', 'Replies'],
            ['thread-2', 'Sheet thread', 'draft', '', '0', '0', '0', '0']
          ]
        }
      };

      mockSheetsApi.spreadsheets.values.get.mockResolvedValue(sheetData);
      mockSheetsApi.spreadsheets.values.update.mockResolvedValue({
        data: { updatedCells: 2 }
      });

      const result = await sheetsService.bidirectionalSync(localThreads);

      expect(result.success).toBe(true);
      expect(result.threadsFromSheet).toHaveLength(1);
      expect(result.threadsFromSheet[0].id).toBe('thread-2');
      expect(result.syncedToSheet).toBe(true);
    });
  });

  describe('Connection Validation', () => {
    it('should validate connection successfully', async () => {
      mockSheetsApi.spreadsheets.values.get.mockResolvedValue({
        data: {
          values: [['Test']]
        }
      });

      const isValid = await sheetsService.validateConnection();

      expect(isValid).toBe(true);
      expect(mockSheetsApi.spreadsheets.values.get).toHaveBeenCalled();
    });

    it('should handle connection validation errors', async () => {
      const error = new Error('Connection failed');
      mockSheetsApi.spreadsheets.values.get.mockRejectedValue(error);

      const isValid = await sheetsService.validateConnection();

      expect(isValid).toBe(false);
    });
  });

  describe('Data Format Conversion', () => {
    it('should convert thread content array to string', async () => {
      const threads = [
        {
          id: 'thread-1',
          content: ['First tweet', 'Second tweet', 'Third tweet'],
          status: 'draft'
        }
      ];

      mockSheetsApi.spreadsheets.values.update.mockResolvedValue({
        data: { updatedCells: 2 }
      });

      await sheetsService.syncThreadsToSheet(threads);

      const updateCall = mockSheetsApi.spreadsheets.values.update.mock.calls[0][0];
      const sheetRow = updateCall.resource.values[1];
      
      expect(sheetRow[1]).toBe('First tweet; Second tweet; Third tweet');
    });

    it('should parse string content back to array', async () => {
      const mockData = {
        data: {
          values: [
            ['ID', 'Content', 'Status', 'Published Time', 'Views', 'Likes', 'Retweets', 'Replies'],
            ['thread-1', 'First tweet; Second tweet; Third tweet', 'draft', '', '0', '0', '0', '0']
          ]
        }
      };

      mockSheetsApi.spreadsheets.values.get.mockResolvedValue(mockData);

      const threads = await sheetsService.getThreadsFromSheet();

      expect(threads[0].content).toEqual(['First tweet', 'Second tweet', 'Third tweet']);
    });

    it('should handle date formatting', async () => {
      const publishedTime = new Date('2024-01-01T15:30:00Z');
      const threads = [
        {
          id: 'thread-1',
          content: ['Test'],
          status: 'published',
          publishedTime
        }
      ];

      mockSheetsApi.spreadsheets.values.update.mockResolvedValue({
        data: { updatedCells: 2 }
      });

      await sheetsService.syncThreadsToSheet(threads);

      const updateCall = mockSheetsApi.spreadsheets.values.update.mock.calls[0][0];
      const sheetRow = updateCall.resource.values[1];
      
      expect(sheetRow[3]).toBe(publishedTime.toISOString());
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors', async () => {
      const error = new Error('Authentication failed');
      error.code = 401;

      mockSheetsApi.spreadsheets.values.get.mockRejectedValue(error);

      await expect(sheetsService.getThreadsFromSheet()).rejects.toThrow('Authentication failed');
    });

    it('should handle quota exceeded errors', async () => {
      const error = new Error('Quota exceeded');
      error.code = 429;

      mockSheetsApi.spreadsheets.values.get.mockRejectedValue(error);

      await expect(sheetsService.getThreadsFromSheet()).rejects.toThrow('Quota exceeded');
    });

    it('should handle invalid spreadsheet ID', async () => {
      const error = new Error('Spreadsheet not found');
      error.code = 404;

      mockSheetsApi.spreadsheets.values.get.mockRejectedValue(error);

      await expect(sheetsService.getThreadsFromSheet()).rejects.toThrow('Spreadsheet not found');
    });
  });
});