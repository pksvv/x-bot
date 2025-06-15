import { AuthService } from '../../../src/services/AuthService';
import { TestDatabase } from '../../helpers/database.helper';
import bcrypt from 'bcryptjs';

// Mock the database
jest.mock('../../../config/database', () => ({
  db: null // Will be set in beforeEach
}));

describe('AuthService', () => {
  let authService: AuthService;
  let testDb: TestDatabase;

  beforeEach(async () => {
    testDb = new TestDatabase();
    await testDb.initialize();
    
    // Mock the database import
    const dbModule = require('../../../config/database');
    dbModule.db = testDb.getDatabase();
    
    authService = new AuthService();
  });

  afterEach(async () => {
    await testDb.cleanup();
  });

  describe('Password Management', () => {
    it('should hash passwords correctly', async () => {
      const password = 'testpassword123';
      const hash = await authService.hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(await bcrypt.compare(password, hash)).toBe(true);
    });

    it('should verify passwords correctly', async () => {
      const password = 'testpassword123';
      const hash = await authService.hashPassword(password);
      
      const isValid = await authService.verifyPassword(password, hash);
      const isInvalid = await authService.verifyPassword('wrongpassword', hash);
      
      expect(isValid).toBe(true);
      expect(isInvalid).toBe(false);
    });
  });

  describe('JWT Token Management', () => {
    it('should generate valid JWT tokens', () => {
      const payload = { userId: '123', username: 'test' };
      const token = authService.generateToken(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should verify valid JWT tokens', () => {
      const payload = { userId: '123', username: 'test' };
      const token = authService.generateToken(payload);
      
      const decoded = authService.verifyToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.username).toBe(payload.username);
    });

    it('should reject invalid JWT tokens', () => {
      const invalidToken = 'invalid.token.here';
      const decoded = authService.verifyToken(invalidToken);
      
      expect(decoded).toBeNull();
    });
  });

  describe('User Registration', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const result = await authService.register(userData);

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.user.username).toBe(userData.username);
      expect(result.user.email).toBe(userData.email);
      expect(result.user.role).toBe('user');
    });

    it('should reject registration with missing fields', async () => {
      const userData = {
        username: 'testuser',
        email: '',
        password: 'password123'
      };

      await expect(authService.register(userData)).rejects.toThrow('Username, email, and password are required');
    });

    it('should reject registration with short password', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: '123'
      };

      await expect(authService.register(userData)).rejects.toThrow('Password must be at least 8 characters long');
    });

    it('should reject duplicate username', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      await authService.register(userData);
      
      const duplicateData = {
        username: 'testuser',
        email: 'different@example.com',
        password: 'password456'
      };

      await expect(authService.register(duplicateData)).rejects.toThrow('Username or email already exists');
    });
  });

  describe('User Login', () => {
    beforeEach(async () => {
      // Create a test user
      await testDb.createTestUser({
        username: 'testuser',
        email: 'test@example.com',
        password_hash: await authService.hashPassword('password123')
      });
    });

    it('should login with valid credentials', async () => {
      const credentials = {
        username: 'testuser',
        password: 'password123'
      };

      const result = await authService.login(credentials);

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.user.username).toBe(credentials.username);
    });

    it('should reject login with invalid username', async () => {
      const credentials = {
        username: 'nonexistent',
        password: 'password123'
      };

      await expect(authService.login(credentials)).rejects.toThrow('Invalid username or password');
    });

    it('should reject login with invalid password', async () => {
      const credentials = {
        username: 'testuser',
        password: 'wrongpassword'
      };

      await expect(authService.login(credentials)).rejects.toThrow('Invalid username or password');
    });
  });

  describe('API Key Management', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await testDb.createTestUser();
    });

    it('should create API key successfully', async () => {
      const keyName = 'Test API Key';
      const permissions = ['threads:read', 'threads:write'];

      const apiKey = await authService.createApiKey(testUser.id, keyName, permissions);

      expect(apiKey).toBeDefined();
      expect(apiKey.id).toMatch(/^ttb_[a-f0-9]{32}$/);
      expect(apiKey.keyName).toBe(keyName);
      expect(apiKey.permissions).toEqual(permissions);
      expect(apiKey.isActive).toBe(true);
    });

    it('should validate API key successfully', async () => {
      const keyName = 'Test API Key';
      const permissions = ['threads:read'];
      
      const createdKey = await authService.createApiKey(testUser.id, keyName, permissions);
      const result = await authService.validateApiKey(createdKey.id);

      expect(result).toBeDefined();
      expect(result!.user.id).toBe(testUser.id);
      expect(result!.apiKey.keyName).toBe(keyName);
      expect(result!.apiKey.permissions).toEqual(permissions);
    });

    it('should reject invalid API key', async () => {
      const invalidKey = 'ttb_invalidkey';
      const result = await authService.validateApiKey(invalidKey);

      expect(result).toBeNull();
    });

    it('should reject API key without proper prefix', async () => {
      const invalidKey = 'invalid_key_format';
      const result = await authService.validateApiKey(invalidKey);

      expect(result).toBeNull();
    });
  });

  describe('Session Management', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await testDb.createTestUser();
    });

    it('should create session successfully', async () => {
      const session = await authService.createSession(testUser.id);

      expect(session).toBeDefined();
      expect(session.userId).toBe(testUser.id);
      expect(session.token).toBeDefined();
      expect(session.expiresAt).toBeInstanceOf(Date);
      expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should validate session successfully', async () => {
      const session = await authService.createSession(testUser.id);
      const user = await authService.validateSession(session.token);

      expect(user).toBeDefined();
      expect(user!.id).toBe(testUser.id);
      expect(user!.username).toBe(testUser.username);
    });

    it('should reject invalid session token', async () => {
      const invalidToken = 'invalid-session-token';
      const user = await authService.validateSession(invalidToken);

      expect(user).toBeNull();
    });
  });

  describe('User Retrieval', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await testDb.createTestUser();
    });

    it('should get user by ID successfully', async () => {
      const user = await authService.getUserById(testUser.id);

      expect(user).toBeDefined();
      expect(user!.id).toBe(testUser.id);
      expect(user!.username).toBe(testUser.username);
      expect(user!.email).toBe(testUser.email);
    });

    it('should return null for non-existent user', async () => {
      const user = await authService.getUserById('non-existent-id');

      expect(user).toBeNull();
    });
  });
});