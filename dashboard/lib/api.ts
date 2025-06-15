import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface ThreadData {
  id: string;
  content: string[];
  tweetIds?: string[];
  scheduledTime?: string;
  publishedTime?: string;
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

export interface MetricsSummary {
  totalThreads: number;
  publishedThreads: number;
  totalViews: number;
  totalLikes: number;
  totalRetweets: number;
  totalReplies: number;
  averageEngagementRate: number;
}

// Thread API calls
export const threadsApi = {
  getAll: () => api.get<{ success: boolean; data: ThreadData[] }>('/api/threads'),
  
  getById: (id: string) => api.get<{ success: boolean; data: ThreadData }>(`/api/threads/${id}`),
  
  create: (data: { content: string[]; scheduledTime?: string }) => 
    api.post<{ success: boolean; data: ThreadData }>('/api/threads', data),
  
  update: (id: string, data: Partial<ThreadData>) => 
    api.put<{ success: boolean; data: ThreadData }>(`/api/threads/${id}`, data),
  
  delete: (id: string) => 
    api.delete<{ success: boolean; message: string }>(`/api/threads/${id}`),
  
  publish: (id: string) => 
    api.post<{ success: boolean; message: string; tweetIds: string[] }>(`/api/threads/${id}/publish`),
  
  schedule: (id: string, scheduledTime: string) => 
    api.post<{ success: boolean; data: ThreadData }>(`/api/threads/${id}/schedule`, { scheduledTime }),
  
  getMetrics: (id: string) => 
    api.get<{ success: boolean; data: ThreadMetrics }>(`/api/threads/${id}/metrics`),
};

// Metrics API calls
export const metricsApi = {
  getSummary: () => 
    api.get<{ success: boolean; data: MetricsSummary }>('/api/metrics/summary'),
  
  getTopThreads: (limit: number = 10) => 
    api.get<{ success: boolean; data: Array<ThreadData & { metrics: ThreadMetrics }> }>(`/api/metrics/top-threads?limit=${limit}`),
  
  collectAll: () => 
    api.post<{ success: boolean; message: string }>('/api/metrics/collect'),
  
  collectForThread: (id: string) => 
    api.post<{ success: boolean; message: string; data: ThreadMetrics }>(`/api/metrics/collect/${id}`),
  
  getHistory: (id: string, days: number = 30) => 
    api.get<{ success: boolean; data: Array<{ date: string; metrics: ThreadMetrics }> }>(`/api/metrics/thread/${id}/history?days=${days}`),
};

// Sheets API calls
export const sheetsApi = {
  validate: () => 
    api.get<{ success: boolean; connected: boolean; message: string }>('/api/sheets/validate'),
  
  syncFromDb: () => 
    api.post<{ success: boolean; message: string }>('/api/sheets/sync-from-db'),
  
  syncToDb: () => 
    api.post<{ success: boolean; message: string }>('/api/sheets/sync-to-db'),
  
  bidirectionalSync: () => 
    api.post<{ success: boolean; message: string }>('/api/sheets/bidirectional-sync'),
  
  getThreads: () => 
    api.get<{ success: boolean; data: ThreadData[]; count: number }>('/api/sheets/threads'),
};

export default api;