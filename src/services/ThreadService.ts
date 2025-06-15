import { db } from '../../config/database';
import { ThreadData, ThreadMetrics } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class ThreadService {
  
  async getAllThreads(): Promise<ThreadData[]> {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM threads ORDER BY created_at DESC`,
        [],
        (err, rows: any[]) => {
          if (err) {
            reject(err);
            return;
          }
          
          const threads = rows.map(row => this.mapRowToThread(row));
          resolve(threads);
        }
      );
    });
  }

  async getThreadById(id: string): Promise<ThreadData | null> {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM threads WHERE id = ?`,
        [id],
        (err, row: any) => {
          if (err) {
            reject(err);
            return;
          }
          
          if (!row) {
            resolve(null);
            return;
          }
          
          resolve(this.mapRowToThread(row));
        }
      );
    });
  }

  async createThread(threadData: Partial<ThreadData>): Promise<ThreadData> {
    const id = uuidv4();
    const thread: ThreadData = {
      id,
      content: threadData.content || [],
      tweetIds: threadData.tweetIds,
      scheduledTime: threadData.scheduledTime,
      status: threadData.status || 'draft',
      publishedTime: threadData.publishedTime
    };

    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO threads (id, content, scheduled_time, published_time, status) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          thread.id,
          JSON.stringify(thread.content),
          thread.scheduledTime?.toISOString(),
          thread.publishedTime?.toISOString(),
          thread.status
        ],
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve(thread);
        }
      );
    });
  }

  async updateThread(id: string, updates: Partial<ThreadData>): Promise<ThreadData | null> {
    const existingThread = await this.getThreadById(id);
    if (!existingThread) {
      return null;
    }

    const updatedThread = { ...existingThread, ...updates };
    
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE threads 
         SET content = ?, scheduled_time = ?, published_time = ?, status = ?
         WHERE id = ?`,
        [
          JSON.stringify(updatedThread.content),
          updatedThread.scheduledTime?.toISOString(),
          updatedThread.publishedTime?.toISOString(),
          updatedThread.status,
          id
        ],
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          
          if (this.changes === 0) {
            resolve(null);
            return;
          }
          
          resolve(updatedThread);
        }
      );
    });
  }

  async deleteThread(id: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      db.run(
        `DELETE FROM threads WHERE id = ?`,
        [id],
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve(this.changes > 0);
        }
      );
    });
  }

  async getScheduledThreads(): Promise<ThreadData[]> {
    const now = new Date().toISOString();
    
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM threads 
         WHERE status = 'scheduled' AND scheduled_time <= ?
         ORDER BY scheduled_time ASC`,
        [now],
        (err, rows: any[]) => {
          if (err) {
            reject(err);
            return;
          }
          
          const threads = rows.map(row => this.mapRowToThread(row));
          resolve(threads);
        }
      );
    });
  }

  async getThreadMetrics(threadId: string): Promise<ThreadMetrics | null> {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM metrics 
         WHERE thread_id = ? 
         ORDER BY recorded_at DESC 
         LIMIT 1`,
        [threadId],
        (err, row: any) => {
          if (err) {
            reject(err);
            return;
          }
          
          if (!row) {
            resolve(null);
            return;
          }
          
          const metrics: ThreadMetrics = {
            views: row.views,
            likes: row.likes,
            retweets: row.retweets,
            replies: row.replies,
            impressions: row.impressions,
            engagementRate: row.engagement_rate
          };
          
          resolve(metrics);
        }
      );
    });
  }

  async saveThreadMetrics(threadId: string, metrics: ThreadMetrics): Promise<void> {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO metrics (thread_id, views, likes, retweets, replies, impressions, engagement_rate)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          threadId,
          metrics.views,
          metrics.likes,
          metrics.retweets,
          metrics.replies,
          metrics.impressions,
          metrics.engagementRate
        ],
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        }
      );
    });
  }

  private mapRowToThread(row: any): ThreadData {
    return {
      id: row.id,
      content: JSON.parse(row.content),
      scheduledTime: row.scheduled_time ? new Date(row.scheduled_time) : undefined,
      publishedTime: row.published_time ? new Date(row.published_time) : undefined,
      status: row.status
    };
  }
}