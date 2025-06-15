import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthService } from '../services/AuthService';
import { AuthRequest, LoginCredentials, RegisterData } from '../types';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  // Validation rules
  static getRegisterValidation() {
    return [
      body('username')
        .isLength({ min: 3, max: 30 })
        .withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),
      body('email')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),
      body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
    ];
  }

  static getLoginValidation() {
    return [
      body('username')
        .notEmpty()
        .withMessage('Username is required'),
      body('password')
        .notEmpty()
        .withMessage('Password is required')
    ];
  }

  static getApiKeyValidation() {
    return [
      body('keyName')
        .isLength({ min: 3, max: 50 })
        .withMessage('Key name must be between 3 and 50 characters'),
      body('permissions')
        .optional()
        .isArray()
        .withMessage('Permissions must be an array')
    ];
  }

  // Register new user
  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      const userData: RegisterData = req.body;
      const result = await this.authService.register(userData);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: result.user.id,
            username: result.user.username,
            email: result.user.email,
            role: result.user.role
          },
          token: result.token
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Registration failed'
      });
    }
  };

  // Login user
  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      const credentials: LoginCredentials = req.body;
      const result = await this.authService.login(credentials);

      // Create session for web clients
      const session = await this.authService.createSession(result.user.id);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: result.user.id,
            username: result.user.username,
            email: result.user.email,
            role: result.user.role
          },
          token: result.token,
          sessionToken: session.token
        }
      });
    } catch (error: any) {
      res.status(401).json({
        success: false,
        error: error.message || 'Login failed'
      });
    }
  };

  // Get current user profile
  getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: req.user.id,
            username: req.user.username,
            email: req.user.email,
            role: req.user.role,
            isActive: req.user.isActive,
            createdAt: req.user.createdAt
          }
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get profile'
      });
    }
  };

  // Create API key
  createApiKey = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { keyName, permissions = [] } = req.body;
      const apiKey = await this.authService.createApiKey(req.user.id, keyName, permissions);

      res.status(201).json({
        success: true,
        message: 'API key created successfully',
        data: {
          apiKey: apiKey.id, // This is the actual key to use
          keyName: apiKey.keyName,
          permissions: apiKey.permissions,
          createdAt: apiKey.createdAt
        },
        warning: 'Store this API key securely. You will not be able to view it again.'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create API key'
      });
    }
  };

  // List user's API keys (without showing the actual keys)
  listApiKeys = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // This would require a new method in AuthService
      // For now, return a placeholder response
      res.status(200).json({
        success: true,
        data: {
          apiKeys: []
        },
        message: 'API key listing feature coming soon'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to list API keys'
      });
    }
  };

  // Revoke API key
  revokeApiKey = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { keyId } = req.params;
      await this.authService.revokeApiKey(keyId, req.user.id);

      res.status(200).json({
        success: true,
        message: 'API key revoked successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to revoke API key'
      });
    }
  };

  // Logout (invalidate session)
  logout = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const sessionToken = req.headers['x-session-token'] as string;
      
      if (sessionToken) {
        await this.authService.logout(sessionToken);
      }

      res.status(200).json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Logout failed'
      });
    }
  };

  // Health check for authentication service
  healthCheck = async (req: Request, res: Response): Promise<void> => {
    try {
      res.status(200).json({
        success: true,
        message: 'Authentication service is healthy',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Authentication service unhealthy'
      });
    }
  };

  // Cleanup expired sessions (admin only)
  cleanupSessions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Admin access required'
        });
        return;
      }

      await this.authService.cleanupExpiredSessions();

      res.status(200).json({
        success: true,
        message: 'Expired sessions cleaned up successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Session cleanup failed'
      });
    }
  };
}