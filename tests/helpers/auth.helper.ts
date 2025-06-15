import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

export class AuthHelper {
  private static jwtSecret = process.env.JWT_SECRET || 'test-jwt-secret-key';

  static generateToken(payload: any): string {
    return jwt.sign(payload, this.jwtSecret, { expiresIn: '24h' });
  }

  static generateTestUser(overrides: any = {}): any {
    return {
      id: uuidv4(),
      username: 'testuser',
      email: 'test@example.com',
      role: 'user',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  static generateTestAdmin(overrides: any = {}): any {
    return this.generateTestUser({
      username: 'admin',
      email: 'admin@example.com',
      role: 'admin',
      ...overrides
    });
  }

  static generateJWTToken(user: any): string {
    return this.generateToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    });
  }

  static generateApiKey(): string {
    return `ttb_${uuidv4().replace(/-/g, '')}`;
  }

  static getAuthHeaders(token: string): any {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  static getApiKeyHeaders(apiKey: string): any {
    return {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json'
    };
  }

  static mockAuthRequest(user: any, apiKey?: any): any {
    return {
      user,
      apiKey,
      headers: {},
      body: {},
      params: {},
      query: {}
    };
  }
}