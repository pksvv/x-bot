import { authenticate, authenticateJWT, authenticateApiKey, requireRole, requirePermission } from '../../../src/middleware/auth';
import { AuthService } from '../../../src/services/AuthService';
import { MockHelper } from '../../helpers/mock.helper';
import { AuthHelper } from '../../helpers/auth.helper';

// Mock the AuthService
jest.mock('../../../src/services/AuthService');
const MockedAuthService = AuthService as jest.MockedClass<typeof AuthService>;

describe('Authentication Middleware', () => {
  let authService: jest.Mocked<AuthService>;
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    authService = new MockedAuthService() as jest.Mocked<AuthService>;
    req = MockHelper.mockRequest();
    res = MockHelper.mockResponse();
    next = MockHelper.mockNext();
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('JWT Authentication', () => {
    it('should authenticate valid JWT token', async () => {
      const testUser = AuthHelper.generateTestUser();
      const token = AuthHelper.generateJWTToken(testUser);
      
      req.headers.authorization = `Bearer ${token}`;
      
      authService.verifyToken.mockReturnValue({ userId: testUser.id });
      authService.getUserById.mockResolvedValue(testUser);

      await authenticateJWT(req, res, next);

      expect(req.user).toEqual(testUser);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject request without authorization header', async () => {
      await authenticateJWT(req, res, next);

      MockHelper.expectUnauthorized(res);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with malformed authorization header', async () => {
      req.headers.authorization = 'InvalidHeader';

      await authenticateJWT(req, res, next);

      MockHelper.expectUnauthorized(res);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid JWT token', async () => {
      req.headers.authorization = 'Bearer invalid-token';
      
      authService.verifyToken.mockReturnValue(null);

      await authenticateJWT(req, res, next);

      MockHelper.expectUnauthorized(res);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject token for non-existent user', async () => {
      const token = AuthHelper.generateJWTToken({ id: 'non-existent' });
      req.headers.authorization = `Bearer ${token}`;
      
      authService.verifyToken.mockReturnValue({ userId: 'non-existent' });
      authService.getUserById.mockResolvedValue(null);

      await authenticateJWT(req, res, next);

      MockHelper.expectUnauthorized(res);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('API Key Authentication', () => {
    it('should authenticate valid API key', async () => {
      const testUser = AuthHelper.generateTestUser();
      const apiKey = AuthHelper.generateApiKey();
      const testApiKey = { id: 'key-id', permissions: ['threads:read'] };
      
      req.headers['x-api-key'] = apiKey;
      
      authService.validateApiKey.mockResolvedValue({ user: testUser, apiKey: testApiKey });

      await authenticateApiKey(req, res, next);

      expect(req.user).toEqual(testUser);
      expect(req.apiKey).toEqual(testApiKey);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject request without API key header', async () => {
      await authenticateApiKey(req, res, next);

      MockHelper.expectUnauthorized(res);
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid API key', async () => {
      req.headers['x-api-key'] = 'invalid-api-key';
      
      authService.validateApiKey.mockResolvedValue(null);

      await authenticateApiKey(req, res, next);

      MockHelper.expectUnauthorized(res);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Combined Authentication', () => {
    it('should authenticate with JWT when both JWT and API key are provided', async () => {
      const testUser = AuthHelper.generateTestUser();
      const token = AuthHelper.generateJWTToken(testUser);
      const apiKey = AuthHelper.generateApiKey();
      
      req.headers.authorization = `Bearer ${token}`;
      req.headers['x-api-key'] = apiKey;
      
      authService.verifyToken.mockReturnValue({ userId: testUser.id });
      authService.getUserById.mockResolvedValue(testUser);

      await authenticate(req, res, next);

      expect(req.user).toEqual(testUser);
      expect(next).toHaveBeenCalled();
    });

    it('should authenticate with API key when only API key is provided', async () => {
      const testUser = AuthHelper.generateTestUser();
      const apiKey = AuthHelper.generateApiKey();
      const testApiKey = { id: 'key-id', permissions: ['threads:read'] };
      
      req.headers['x-api-key'] = apiKey;
      
      authService.validateApiKey.mockResolvedValue({ user: testUser, apiKey: testApiKey });

      await authenticate(req, res, next);

      expect(req.user).toEqual(testUser);
      expect(req.apiKey).toEqual(testApiKey);
      expect(next).toHaveBeenCalled();
    });

    it('should reject when no authentication is provided', async () => {
      await authenticate(req, res, next);

      MockHelper.expectUnauthorized(res);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Role-based Authorization', () => {
    it('should allow access for users with required role', () => {
      const testUser = AuthHelper.generateTestAdmin();
      req.user = testUser;
      
      const middleware = requireRole(['admin']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny access for users without required role', () => {
      const testUser = AuthHelper.generateTestUser(); // regular user
      req.user = testUser;
      
      const middleware = requireRole(['admin']);
      middleware(req, res, next);

      MockHelper.expectForbidden(res);
      expect(next).not.toHaveBeenCalled();
    });

    it('should deny access when user is not authenticated', () => {
      const middleware = requireRole(['admin']);
      middleware(req, res, next);

      MockHelper.expectUnauthorized(res);
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow access for multiple valid roles', () => {
      const testUser = AuthHelper.generateTestUser();
      req.user = testUser;
      
      const middleware = requireRole(['admin', 'user']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('Permission-based Authorization', () => {
    it('should allow access for admin users regardless of permissions', () => {
      const testUser = AuthHelper.generateTestAdmin();
      req.user = testUser;
      
      const middleware = requirePermission('any:permission');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow access for API key with required permission', () => {
      const testUser = AuthHelper.generateTestUser();
      const testApiKey = { 
        id: 'key-id', 
        permissions: ['threads:read', 'threads:write'] 
      };
      
      req.user = testUser;
      req.apiKey = testApiKey;
      
      const middleware = requirePermission('threads:read');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow access for API key with wildcard permission', () => {
      const testUser = AuthHelper.generateTestUser();
      const testApiKey = { 
        id: 'key-id', 
        permissions: ['*'] 
      };
      
      req.user = testUser;
      req.apiKey = testApiKey;
      
      const middleware = requirePermission('any:permission');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny access for API key without required permission', () => {
      const testUser = AuthHelper.generateTestUser();
      const testApiKey = { 
        id: 'key-id', 
        permissions: ['threads:read'] 
      };
      
      req.user = testUser;
      req.apiKey = testApiKey;
      
      const middleware = requirePermission('threads:write');
      middleware(req, res, next);

      MockHelper.expectForbidden(res);
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow access for regular user with default permissions', () => {
      const testUser = AuthHelper.generateTestUser();
      req.user = testUser;
      
      const middleware = requirePermission('threads:read');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should deny access for regular user without default permissions', () => {
      const testUser = AuthHelper.generateTestUser();
      req.user = testUser;
      
      const middleware = requirePermission('admin:system');
      middleware(req, res, next);

      MockHelper.expectForbidden(res);
      expect(next).not.toHaveBeenCalled();
    });

    it('should deny access when user is not authenticated', () => {
      const middleware = requirePermission('threads:read');
      middleware(req, res, next);

      MockHelper.expectUnauthorized(res);
      expect(next).not.toHaveBeenCalled();
    });
  });
});