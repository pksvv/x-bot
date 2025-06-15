import sqlite3 from 'sqlite3';
import { v4 as uuidv4 } from 'uuid';

export class TestDatabase {
  private db: sqlite3.Database;

  constructor() {
    this.db = new sqlite3.Database(':memory:');
  }

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const createTables = `
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT DEFAULT 'user',
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS user_sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          token TEXT UNIQUE NOT NULL,
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS api_keys (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          key_name TEXT NOT NULL,
          key_hash TEXT NOT NULL,
          permissions TEXT DEFAULT '[]',
          is_active BOOLEAN DEFAULT 1,
          last_used DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS threads (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          content TEXT NOT NULL,
          tweet_ids TEXT,
          scheduled_time DATETIME,
          published_time DATETIME,
          status TEXT DEFAULT 'draft',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id)
        );

        CREATE TABLE IF NOT EXISTS metrics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          thread_id TEXT,
          views INTEGER DEFAULT 0,
          likes INTEGER DEFAULT 0,
          retweets INTEGER DEFAULT 0,
          replies INTEGER DEFAULT 0,
          impressions INTEGER DEFAULT 0,
          engagement_rate REAL DEFAULT 0,
          recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (thread_id) REFERENCES threads (id)
        );
      `;

      this.db.exec(createTables, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async createTestUser(userData: any = {}): Promise<any> {
    const defaultUser = {
      id: uuidv4(),
      username: 'testuser',
      email: 'test@example.com',
      password_hash: '$2a$12$test.hash.here',
      role: 'user',
      is_active: 1,
      ...userData
    };

    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO users (id, username, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?, ?)`,
        [defaultUser.id, defaultUser.username, defaultUser.email, defaultUser.password_hash, defaultUser.role, defaultUser.is_active],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(defaultUser);
          }
        }
      );
    });
  }

  async createTestThread(threadData: any = {}): Promise<any> {
    const defaultThread = {
      id: uuidv4(),
      user_id: null,
      content: JSON.stringify(['Test thread content']),
      tweet_ids: null,
      scheduled_time: null,
      published_time: null,
      status: 'draft',
      ...threadData
    };

    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO threads (id, user_id, content, tweet_ids, scheduled_time, published_time, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [defaultThread.id, defaultThread.user_id, defaultThread.content, defaultThread.tweet_ids, defaultThread.scheduled_time, defaultThread.published_time, defaultThread.status],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(defaultThread);
          }
        }
      );
    });
  }

  async createTestMetrics(metricsData: any = {}): Promise<any> {
    const defaultMetrics = {
      thread_id: uuidv4(),
      views: 100,
      likes: 10,
      retweets: 5,
      replies: 3,
      impressions: 200,
      engagement_rate: 0.09,
      ...metricsData
    };

    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO metrics (thread_id, views, likes, retweets, replies, impressions, engagement_rate) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [defaultMetrics.thread_id, defaultMetrics.views, defaultMetrics.likes, defaultMetrics.retweets, defaultMetrics.replies, defaultMetrics.impressions, defaultMetrics.engagement_rate],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id: this.lastID, ...defaultMetrics });
          }
        }
      );
    });
  }

  getDatabase(): sqlite3.Database {
    return this.db;
  }

  async cleanup(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async clearAllTables(): Promise<void> {
    const tables = ['metrics', 'threads', 'api_keys', 'user_sessions', 'users'];
    
    for (const table of tables) {
      await new Promise<void>((resolve, reject) => {
        this.db.run(`DELETE FROM ${table}`, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }
  }
}