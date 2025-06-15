import request from 'supertest';
import express from 'express';
import { TestDatabase } from '../helpers/database.helper';
import authRoutes from '../../src/routes/auth';
import { generalRateLimit } from '../../src/middleware/auth';

// Mock the database
jest.mock('../../config/database', () => ({
  db: null
}));

describe('Authentication Integration Tests', () => {
  let app: express.Application;
  let testDb: TestDatabase;

  beforeAll(async () => {
    testDb = new TestDatabase();
    await testDb.initialize();
    
    // Mock the database import
    const dbModule = require('../../config/database');
    dbModule.db = testDb.getDatabase();

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  beforeEach(async () => {
    await testDb.clearAllTables();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.data.user.username).toBe(userData.username);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.id).toBeDefined();
    });

    it('should reject registration with duplicate username', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      // Register first user
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Try to register with same username
      const duplicateData = {
        username: 'testuser',
        email: 'different@example.com',
        password: 'password456'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(duplicateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });

    it('should reject registration with invalid data', async () => {
      const invalidData = {
        username: 'te', // too short
        email: 'invalid-email',
        password: '123' // too short
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData);
    });

    it('should login with valid credentials', async () => {
      const credentials = {
        username: 'testuser',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data.user.username).toBe(credentials.username);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.sessionToken).toBeDefined();
    });

    it('should reject login with invalid username', async () => {
      const credentials = {
        username: 'nonexistent',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid username or password');
    });

    it('should reject login with invalid password', async () => {
      const credentials = {
        username: 'testuser',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid username or password');
    });
  });

  describe('GET /api/auth/profile', () => {
    let authToken: string;

    beforeEach(async () => {
      // Register and login to get token
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const loginResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      authToken = loginResponse.body.data.token;
    });

    it('should return user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.username).toBe('testuser');
      expect(response.body.data.user.email).toBe('test@example.com');
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('No authorization header provided');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/api-keys', () => {
    let authToken: string;

    beforeEach(async () => {
      // Register and login to get token
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const loginResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      authToken = loginResponse.body.data.token;
    });

    it('should create API key successfully', async () => {
      const keyData = {
        keyName: 'Test API Key',
        permissions: ['threads:read', 'threads:write']
      };

      const response = await request(app)
        .post('/api/auth/api-keys')
        .set('Authorization', `Bearer ${authToken}`)
        .send(keyData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('API key created successfully');
      expect(response.body.data.apiKey).toMatch(/^ttb_[a-f0-9]{32}$/);
      expect(response.body.data.keyName).toBe(keyData.keyName);
      expect(response.body.data.permissions).toEqual(keyData.permissions);
      expect(response.body.warning).toBeDefined();
    });

    it('should reject API key creation without authentication', async () => {
      const keyData = {
        keyName: 'Test API Key',
        permissions: ['threads:read']
      };

      const response = await request(app)
        .post('/api/auth/api-keys')
        .send(keyData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    let authToken: string;
    let sessionToken: string;

    beforeEach(async () => {
      // Register and login to get tokens
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const loginResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      authToken = loginResponse.body.data.token;
      sessionToken = loginResponse.body.data.sessionToken;
    });

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Session-Token', sessionToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logout successful');
    });

    it('should logout without session token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/auth/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/auth/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Authentication service is healthy');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Authentication Flow', () => {
    it('should complete full authentication flow', async () => {
      // 1. Register
      const userData = {
        username: 'flowtest',
        email: 'flow@example.com',
        password: 'password123'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      const { token: registerToken } = registerResponse.body.data;

      // 2. Get profile with registration token
      const profileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${registerToken}`)
        .expect(200);

      expect(profileResponse.body.data.user.username).toBe(userData.username);

      // 3. Create API key
      const keyResponse = await request(app)
        .post('/api/auth/api-keys')
        .set('Authorization', `Bearer ${registerToken}`)
        .send({
          keyName: 'Flow Test Key',
          permissions: ['threads:read']
        })
        .expect(201);

      const apiKey = keyResponse.body.data.apiKey;

      // 4. Login with credentials
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: userData.username,
          password: userData.password
        })
        .expect(200);

      const { token: loginToken, sessionToken } = loginResponse.body.data;

      // 5. Get profile with login token
      await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${loginToken}`)
        .expect(200);

      // 6. Logout
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${loginToken}`)
        .set('X-Session-Token', sessionToken)
        .expect(200);

      // Verify tokens are still valid (logout only invalidates session)
      await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${loginToken}`)
        .expect(200);
    });
  });
});