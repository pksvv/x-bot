import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, '../database/threads.db');

export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

export const initializeDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const createTables = `
      CREATE TABLE IF NOT EXISTS threads (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        tweet_ids TEXT,
        scheduled_time DATETIME,
        published_time DATETIME,
        status TEXT DEFAULT 'draft',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

    db.exec(createTables, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};