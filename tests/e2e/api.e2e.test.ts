import request from 'supertest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { TestDatabase } from '../helpers/database.helper';
import { AuthHelper } from '../helpers/auth.helper';

// Import routes
import authRoutes from '../../src/routes/auth';
import threadRoutes from '../../src/routes/threadRoutes';
import metricsRoutes from '../../src/routes/metricsRoutes';
import sheetsRoutes from '../../src/routes/sheetsRoutes';

// Mock external services
jest.mock('../../src/services/TwitterService');
jest.mock('../../src/services/GoogleSheetsService');
jest.mock('../../config/database', () => ({
  db: null
}));

describe('End-to-End API Tests', () => {
  let app: express.Application;
  let testDb: TestDatabase;
  let authToken: string;
  let apiKey: string;
  let userId: string;

  beforeAll(async () => {
    // Setup test database
    testDb = new TestDatabase();
    await testDb.initialize();
    
    // Mock the database import
    const dbModule = require('../../config/database');
    dbModule.db = testDb.getDatabase();

    // Setup Express app
    app = express();
    app.use(helmet());
    app.use(cors());
    app.use(express.json());

    // Setup routes
    app.use('/api/auth', authRoutes);
    app.use('/api/threads', threadRoutes);
    app.use('/api/metrics', metricsRoutes);
    app.use('/api/sheets', sheetsRoutes);

    // Health check
    app.get('/health', (req, res) => {
      res.json({ status: 'healthy' });
    });
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  beforeEach(async () => {
    await testDb.clearAllTables();
    
    // Create test user and get authentication
    const userData = {
      username: 'e2euser',
      email: 'e2e@example.com',
      password: 'password123'
    };

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(userData);

    authToken = registerResponse.body.data.token;
    userId = registerResponse.body.data.user.id;

    // Create API key
    const apiKeyResponse = await request(app)
      .post('/api/auth/api-keys')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        keyName: 'E2E Test Key',
        permissions: ['*']
      });

    apiKey = apiKeyResponse.body.data.apiKey;
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
    });
  });

  describe('Authentication Flow', () => {
    it('should complete full authentication workflow', async () => {
      // Register new user
      const newUser = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'newpassword123'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(newUser)
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      const newAuthToken = registerResponse.body.data.token;

      // Get profile
      const profileResponse = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${newAuthToken}`)
        .expect(200);

      expect(profileResponse.body.data.user.username).toBe(newUser.username);

      // Create API key
      const keyResponse = await request(app)
        .post('/api/auth/api-keys')
        .set('Authorization', `Bearer ${newAuthToken}`)
        .send({ keyName: 'Test Key', permissions: ['threads:read'] })
        .expect(201);

      expect(keyResponse.body.data.apiKey).toMatch(/^ttb_/);

      // Login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ username: newUser.username, password: newUser.password })
        .expect(200);

      expect(loginResponse.body.data.token).toBeDefined();

      // Logout
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
        .expect(200);
    });
  });

  describe('Thread Management Workflow', () => {
    it('should manage thread lifecycle with JWT authentication', async () => {
      // Create thread
      const threadData = {
        content: ['First tweet', 'Second tweet', 'Third tweet']
      };

      const createResponse = await request(app)
        .post('/api/threads')
        .set('Authorization', `Bearer ${authToken}`)
        .send(threadData)
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      const threadId = createResponse.body.data.id;

      // Get all threads
      const listResponse = await request(app)
        .get('/api/threads')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(listResponse.body.data).toHaveLength(1);
      expect(listResponse.body.data[0].id).toBe(threadId);

      // Get specific thread
      const getResponse = await request(app)
        .get(`/api/threads/${threadId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getResponse.body.data.content).toEqual(threadData.content);

      // Update thread
      const updateData = {
        content: ['Updated first tweet', 'Updated second tweet']
      };

      const updateResponse = await request(app)
        .put(`/api/threads/${threadId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.data.content).toEqual(updateData.content);

      // Delete thread
      await request(app)
        .delete(`/api/threads/${threadId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify deletion
      await request(app)
        .get(`/api/threads/${threadId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should manage thread lifecycle with API key authentication', async () => {
      // Create thread with API key
      const threadData = {
        content: ['API key thread content']
      };

      const createResponse = await request(app)
        .post('/api/threads')
        .set('X-API-Key', apiKey)
        .send(threadData)
        .expect(201);

      const threadId = createResponse.body.data.id;

      // Get thread with API key
      const getResponse = await request(app)
        .get(`/api/threads/${threadId}`)
        .set('X-API-Key', apiKey)
        .expect(200);

      expect(getResponse.body.data.content).toEqual(threadData.content);

      // Update with API key
      await request(app)
        .put(`/api/threads/${threadId}`)
        .set('X-API-Key', apiKey)
        .send({ content: ['Updated content'] })
        .expect(200);

      // Delete with API key
      await request(app)
        .delete(`/api/threads/${threadId}`)
        .set('X-API-Key', apiKey)
        .expect(200);
    });
  });

  describe('Metrics Workflow', () => {
    let threadId: string;

    beforeEach(async () => {
      // Create a test thread first
      const createResponse = await request(app)
        .post('/api/threads')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: ['Test thread for metrics'] });

      threadId = createResponse.body.data.id;
    });

    it('should retrieve metrics summary', async () => {
      const response = await request(app)
        .get('/api/metrics/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalThreads');
      expect(response.body.data).toHaveProperty('totalViews');
      expect(response.body.data).toHaveProperty('totalEngagement');
    });

    it('should get top performing threads', async () => {
      const response = await request(app)
        .get('/api/metrics/top-threads')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get thread-specific metrics', async () => {
      const response = await request(app)
        .get(`/api/metrics/thread/${threadId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should trigger manual metrics collection', async () => {
      const response = await request(app)
        .post('/api/metrics/collect')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Google Sheets Integration Workflow', () => {
    it('should validate Google Sheets connection', async () => {
      const response = await request(app)
        .get('/api/sheets/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should sync data to Google Sheets', async () => {
      // Create a thread first
      await request(app)
        .post('/api/threads')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: ['Sheet sync test'] });

      const response = await request(app)
        .post('/api/sheets/sync-from-db')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should perform bidirectional sync', async () => {
      const response = await request(app)
        .post('/api/sheets/bidirectional-sync')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Permission-based Access Control', () => {
    let limitedApiKey: string;

    beforeEach(async () => {
      // Create API key with limited permissions
      const keyResponse = await request(app)
        .post('/api/auth/api-keys')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          keyName: 'Limited Key',
          permissions: ['threads:read']
        });

      limitedApiKey = keyResponse.body.data.apiKey;
    });

    it('should allow permitted operations', async () => {
      // Create thread first with full permissions
      const createResponse = await request(app)
        .post('/api/threads')
        .set('X-API-Key', apiKey)
        .send({ content: ['Permission test'] });

      const threadId = createResponse.body.data.id;

      // Read operation should work with limited key
      await request(app)
        .get(`/api/threads/${threadId}`)
        .set('X-API-Key', limitedApiKey)
        .expect(200);
    });

    it('should deny unpermitted operations', async () => {
      // Write operation should fail with limited key
      await request(app)
        .post('/api/threads')
        .set('X-API-Key', limitedApiKey)
        .send({ content: ['Should fail'] })
        .expect(403);
    });
  });

  describe('Error Handling', () => {
    it('should handle unauthenticated requests', async () => {
      await request(app)
        .get('/api/threads')
        .expect(401);
    });

    it('should handle invalid authentication tokens', async () => {
      await request(app)
        .get('/api/threads')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should handle invalid API keys', async () => {
      await request(app)
        .get('/api/threads')
        .set('X-API-Key', 'invalid-api-key')
        .expect(401);
    });

    it('should handle non-existent resources', async () => {
      await request(app)
        .get('/api/threads/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should handle malformed request data', async () => {
      await request(app)
        .post('/api/threads')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ invalid: 'data' })
        .expect(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limiting for auth endpoints', async () => {
      // This test would need to be adjusted based on actual rate limiting config
      const promises = [];
      
      // Attempt multiple rapid requests
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post('/api/auth/login')
            .send({ username: 'invalid', password: 'invalid' })
        );
      }

      const responses = await Promise.all(promises);
      
      // At least some should succeed (within rate limit)
      const successfulResponses = responses.filter(r => r.status !== 429);
      expect(successfulResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Data Persistence', () => {
    it('should persist data across requests', async () => {
      // Create thread
      const createResponse = await request(app)
        .post('/api/threads')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: ['Persistence test'] });

      const threadId = createResponse.body.data.id;

      // Verify persistence in different request
      const getResponse = await request(app)
        .get(`/api/threads/${threadId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.body.data.id).toBe(threadId);
      expect(getResponse.body.data.content).toEqual(['Persistence test']);
    });

    it('should maintain user sessions across requests', async () => {
      // First request
      await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Second request with same token
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.user.id).toBe(userId);
    });
  });
});