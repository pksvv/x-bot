export interface TwitterConfig {
  appKey: string;
  appSecret: string;
  accessToken: string;
  accessSecret: string;
}

export interface GoogleSheetsConfig {
  clientEmail: string;
  privateKey: string;
  spreadsheetId: string;
}

export interface ThreadData {
  id: string;
  content: string[];
  scheduledTime?: Date;
  publishedTime?: Date;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  metrics?: ThreadMetrics;
}

export interface ThreadMetrics {
  views: number;
  likes: number;
  retweets: number;
  replies: number;
  impressions: number;
  engagementRate: number;
}