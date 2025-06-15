import { AuthController } from '../../../src/controllers/AuthController';
import { AuthService } from '../../../src/services/AuthService';
import { MockHelper } from '../../helpers/mock.helper';
import { AuthHelper } from '../../helpers/auth.helper';

// Mock the AuthService
jest.mock('../../../src/services/AuthService');
const MockedAuthService = AuthService as jest.MockedClass<typeof AuthService>;

// Mock express-validator
jest.mock('express-validator', () => ({
  body: jest.fn().mockReturnValue({
    isLength: jest.fn().mockReturnThis(),
    withMessage: jest.fn().mockReturnThis(),
    matches: jest.fn().mockReturnThis(),
    isEmail: jest.fn().mockReturnThis(),
    normalizeEmail: jest.fn().mockReturnThis(),
    notEmpty: jest.fn().mockReturnThis(),
    optional: jest.fn().mockReturnThis(),
    isArray: jest.fn().mockReturnThis()
  }),
  validationResult: jest.fn()
}));

describe('AuthController', () => {
  let authController: AuthController;
  let authService: jest.Mocked<AuthService>;
  let req: any;
  let res: any;

  beforeEach(() => {
    authService = new MockedAuthService() as jest.Mocked<AuthService>;
    authController = new AuthController();
    (authController as any).authService = authService;
    
    req = MockHelper.mockRequest();
    res = MockHelper.mockResponse();
    
    // Mock validationResult to return no errors by default
    const { validationResult } = require('express-validator');
    validationResult.mockReturnValue({ isEmpty: () => true, array: () => [] });
    
    jest.clearAllMocks();
  });

  describe('User Registration', () => {
    it('should register user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };
      
      const testUser = AuthHelper.generateTestUser(userData);
      const token = AuthHelper.generateJWTToken(testUser);
      
      req.body = userData;
      authService.register.mockResolvedValue({ user: testUser, token });

      await authController.register(req, res);

      expect(authService.register).toHaveBeenCalledWith(userData);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: testUser.id,
            username: testUser.username,
            email: testUser.email,
            role: testUser.role
          },
          token
        }
      });
    });

    it('should handle validation errors', async () => {
      const { validationResult } = require('express-validator');
      validationResult.mockReturnValue({
        isEmpty: () => false,
        array: () => [{ msg: 'Username is required' }]
      });

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        details: [{ msg: 'Username is required' }]
      });
    });

    it('should handle registration errors', async () => {
      req.body = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };
      
      authService.register.mockRejectedValue(new Error('Username already exists'));

      await authController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Username already exists'
      });
    });
  });

  describe('User Login', () => {
    it('should login user successfully', async () => {
      const credentials = {
        username: 'testuser',
        password: 'password123'
      };
      
      const testUser = AuthHelper.generateTestUser();
      const token = AuthHelper.generateJWTToken(testUser);
      const session = { token: 'session-token' };
      
      req.body = credentials;
      authService.login.mockResolvedValue({ user: testUser, token });
      authService.createSession.mockResolvedValue(session as any);

      await authController.login(req, res);

      expect(authService.login).toHaveBeenCalledWith(credentials);
      expect(authService.createSession).toHaveBeenCalledWith(testUser.id);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: testUser.id,
            username: testUser.username,
            email: testUser.email,
            role: testUser.role
          },
          token,
          sessionToken: session.token
        }
      });
    });

    it('should handle login errors', async () => {
      req.body = {
        username: 'testuser',
        password: 'wrongpassword'
      };
      
      authService.login.mockRejectedValue(new Error('Invalid credentials'));

      await authController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid credentials'
      });
    });
  });

  describe('Get Profile', () => {
    it('should return user profile successfully', async () => {
      const testUser = AuthHelper.generateTestUser();
      req.user = testUser;

      await authController.getProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          user: {
            id: testUser.id,
            username: testUser.username,
            email: testUser.email,
            role: testUser.role,
            isActive: testUser.isActive,
            createdAt: testUser.createdAt
          }
        }
      });
    });

    it('should handle unauthenticated request', async () => {
      req.user = null;

      await authController.getProfile(req, res);

      MockHelper.expectUnauthorized(res);
    });
  });

  describe('Create API Key', () => {
    it('should create API key successfully', async () => {
      const testUser = AuthHelper.generateTestUser();
      const keyData = {
        keyName: 'Test API Key',
        permissions: ['threads:read', 'threads:write']
      };
      const createdKey = {
        id: 'ttb_123456789',
        keyName: keyData.keyName,
        permissions: keyData.permissions,
        createdAt: new Date()
      };
      
      req.user = testUser;
      req.body = keyData;
      authService.createApiKey.mockResolvedValue(createdKey as any);

      await authController.createApiKey(req, res);

      expect(authService.createApiKey).toHaveBeenCalledWith(
        testUser.id,
        keyData.keyName,
        keyData.permissions
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'API key created successfully',
        data: {
          apiKey: createdKey.id,
          keyName: createdKey.keyName,
          permissions: createdKey.permissions,
          createdAt: createdKey.createdAt
        },
        warning: 'Store this API key securely. You will not be able to view it again.'
      });
    });

    it('should handle unauthenticated request', async () => {
      req.user = null;
      req.body = { keyName: 'Test Key' };

      await authController.createApiKey(req, res);

      MockHelper.expectUnauthorized(res);
    });
  });

  describe('Revoke API Key', () => {
    it('should revoke API key successfully', async () => {
      const testUser = AuthHelper.generateTestUser();
      const keyId = 'test-key-id';
      
      req.user = testUser;
      req.params = { keyId };
      authService.revokeApiKey.mockResolvedValue();

      await authController.revokeApiKey(req, res);

      expect(authService.revokeApiKey).toHaveBeenCalledWith(keyId, testUser.id);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'API key revoked successfully'
      });
    });

    it('should handle missing key ID', async () => {
      const testUser = AuthHelper.generateTestUser();
      
      req.user = testUser;
      req.params = {};

      await authController.revokeApiKey(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Key ID is required'
      });
    });
  });

  describe('Logout', () => {
    it('should logout successfully with session token', async () => {
      const sessionToken = 'session-token';
      
      req.headers = { 'x-session-token': sessionToken };
      authService.logout.mockResolvedValue();

      await authController.logout(req, res);

      expect(authService.logout).toHaveBeenCalledWith(sessionToken);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logout successful'
      });
    });

    it('should logout successfully without session token', async () => {
      req.headers = {};

      await authController.logout(req, res);

      expect(authService.logout).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Logout successful'
      });
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      await authController.healthCheck(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Authentication service is healthy',
        timestamp: expect.any(String)
      });
    });
  });

  describe('Cleanup Sessions (Admin Only)', () => {
    it('should cleanup sessions for admin user', async () => {
      const adminUser = AuthHelper.generateTestAdmin();
      
      req.user = adminUser;
      authService.cleanupExpiredSessions.mockResolvedValue();

      await authController.cleanupSessions(req, res);

      expect(authService.cleanupExpiredSessions).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Expired sessions cleaned up successfully'
      });
    });

    it('should deny access for non-admin user', async () => {
      const regularUser = AuthHelper.generateTestUser();
      
      req.user = regularUser;

      await authController.cleanupSessions(req, res);

      MockHelper.expectForbidden(res);
      expect(authService.cleanupExpiredSessions).not.toHaveBeenCalled();
    });

    it('should handle unauthenticated request', async () => {
      req.user = null;

      await authController.cleanupSessions(req, res);

      MockHelper.expectForbidden(res);
    });
  });
});