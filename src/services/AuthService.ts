import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../config/database';
import { User, UserSession, ApiKey, LoginCredentials, RegisterData } from '../types';

export class AuthService {
  private readonly jwtSecret: string;
  private readonly sessionDuration: number = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    if (!process.env.JWT_SECRET) {
      console.warn('⚠️ JWT_SECRET not set in environment variables. Using default (not secure for production)');
    }
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateToken(payload: object): string {
    return jwt.sign(payload, this.jwtSecret, { expiresIn: '24h' });
  }

  verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      return null;
    }
  }

  async register(userData: RegisterData): Promise<{ user: User; token: string }> {
    const { username, email, password } = userData;

    // Validate input
    if (!username || !email || !password) {
      throw new Error('Username, email, and password are required');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    const userId = uuidv4();
    const passwordHash = await this.hashPassword(password);

    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO users (id, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`,
        [userId, username, email, passwordHash, 'user'],
        (err) => {
          if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
              reject(new Error('Username or email already exists'));
            } else {
              reject(err);
            }
            return;
          }

          const user: User = {
            id: userId,
            username,
            email,
            role: 'user',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          const token = this.generateToken({ userId, username, email, role: 'user' });
          resolve({ user, token });
        }
      );
    });
  }

  async login(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
    const { username, password } = credentials;

    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM users WHERE username = ? AND is_active = 1`,
        [username],
        async (err, row: any) => {
          if (err) {
            reject(err);
            return;
          }

          if (!row) {
            reject(new Error('Invalid username or password'));
            return;
          }

          const isValidPassword = await this.verifyPassword(password, row.password_hash);
          if (!isValidPassword) {
            reject(new Error('Invalid username or password'));
            return;
          }

          const user: User = {
            id: row.id,
            username: row.username,
            email: row.email,
            role: row.role,
            isActive: Boolean(row.is_active),
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
          };

          const token = this.generateToken({ 
            userId: user.id, 
            username: user.username, 
            email: user.email, 
            role: user.role 
          });

          resolve({ user, token });
        }
      );
    });
  }

  async getUserById(userId: string): Promise<User | null> {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM users WHERE id = ? AND is_active = 1`,
        [userId],
        (err, row: any) => {
          if (err) {
            reject(err);
            return;
          }

          if (!row) {
            resolve(null);
            return;
          }

          const user: User = {
            id: row.id,
            username: row.username,
            email: row.email,
            role: row.role,
            isActive: Boolean(row.is_active),
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
          };

          resolve(user);
        }
      );
    });
  }

  async createSession(userId: string): Promise<UserSession> {
    const sessionId = uuidv4();
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + this.sessionDuration);

    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO user_sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)`,
        [sessionId, userId, token, expiresAt.toISOString()],
        function(err) {
          if (err) {
            reject(err);
            return;
          }

          const session: UserSession = {
            id: sessionId,
            userId,
            token,
            expiresAt,
            createdAt: new Date()
          };

          resolve(session);
        }
      );
    });
  }

  async validateSession(token: string): Promise<User | null> {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT u.*, s.expires_at 
         FROM users u 
         JOIN user_sessions s ON u.id = s.user_id 
         WHERE s.token = ? AND s.expires_at > datetime('now') AND u.is_active = 1`,
        [token],
        (err, row: any) => {
          if (err) {
            reject(err);
            return;
          }

          if (!row) {
            resolve(null);
            return;
          }

          const user: User = {
            id: row.id,
            username: row.username,
            email: row.email,
            role: row.role,
            isActive: Boolean(row.is_active),
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
          };

          resolve(user);
        }
      );
    });
  }

  async createApiKey(userId: string, keyName: string, permissions: string[] = []): Promise<ApiKey> {
    const keyId = uuidv4();
    const apiKey = `ttb_${uuidv4().replace(/-/g, '')}`;
    const keyHash = await this.hashPassword(apiKey);

    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO api_keys (id, user_id, key_name, key_hash, permissions) VALUES (?, ?, ?, ?, ?)`,
        [keyId, userId, keyName, keyHash, JSON.stringify(permissions)],
        function(err) {
          if (err) {
            reject(err);
            return;
          }

          const key: ApiKey = {
            id: keyId,
            userId,
            keyName,
            permissions,
            isActive: true,
            createdAt: new Date()
          };

          // Return the plain API key for the user to store
          resolve({ ...key, id: apiKey });
        }
      );
    });
  }

  async validateApiKey(apiKey: string): Promise<{ user: User; apiKey: ApiKey } | null> {
    if (!apiKey.startsWith('ttb_')) {
      return null;
    }

    return new Promise((resolve, reject) => {
      db.all(
        `SELECT u.*, ak.id as key_id, ak.key_name, ak.key_hash, ak.permissions, ak.is_active as key_active, ak.last_used, ak.created_at as key_created_at
         FROM users u 
         JOIN api_keys ak ON u.id = ak.user_id 
         WHERE ak.is_active = 1 AND u.is_active = 1`,
        [],
        async (err, rows: any[]) => {
          if (err) {
            reject(err);
            return;
          }

          if (!rows || rows.length === 0) {
            resolve(null);
            return;
          }

          // Check each API key hash
          for (const row of rows) {
            try {
              const isValid = await this.verifyPassword(apiKey, row.key_hash);
              if (isValid) {
                // Update last used timestamp
                await this.updateApiKeyLastUsed(row.key_id);

                const user: User = {
                  id: row.id,
                  username: row.username,
                  email: row.email,
                  role: row.role,
                  isActive: Boolean(row.is_active),
                  createdAt: new Date(row.created_at),
                  updatedAt: new Date(row.updated_at)
                };

                const key: ApiKey = {
                  id: row.key_id,
                  userId: row.id,
                  keyName: row.key_name,
                  permissions: JSON.parse(row.permissions || '[]'),
                  isActive: Boolean(row.key_active),
                  lastUsed: row.last_used ? new Date(row.last_used) : undefined,
                  createdAt: new Date(row.key_created_at)
                };

                resolve({ user, apiKey: key });
                return;
              }
            } catch (error) {
              // Continue checking other keys
            }
          }

          resolve(null);
        }
      );
    });
  }

  private async updateApiKeyLastUsed(keyId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE api_keys SET last_used = datetime('now') WHERE id = ?`,
        [keyId],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  async logout(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      db.run(
        `DELETE FROM user_sessions WHERE token = ?`,
        [token],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  async revokeApiKey(keyId: string, userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE api_keys SET is_active = 0 WHERE id = ? AND user_id = ?`,
        [keyId, userId],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  async cleanupExpiredSessions(): Promise<void> {
    return new Promise((resolve, reject) => {
      db.run(
        `DELETE FROM user_sessions WHERE expires_at < datetime('now')`,
        [],
        (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }
}