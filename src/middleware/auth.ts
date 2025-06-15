import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthService } from '../services/AuthService';
import { AuthRequest } from '../types';

const authService = new AuthService();

// JWT Authentication Middleware
export const authenticateJWT = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({ success: false, error: 'No authorization header provided' });
      return;
    }

    const token = authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      res.status(401).json({ success: false, error: 'No token provided' });
      return;
    }

    const decoded = authService.verifyToken(token);
    
    if (!decoded) {
      res.status(401).json({ success: false, error: 'Invalid or expired token' });
      return;
    }

    const user = await authService.getUserById(decoded.userId);
    
    if (!user) {
      res.status(401).json({ success: false, error: 'User not found' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Authentication failed' });
  }
};

// API Key Authentication Middleware
export const authenticateApiKey = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      res.status(401).json({ success: false, error: 'No API key provided' });
      return;
    }

    const result = await authService.validateApiKey(apiKey);
    
    if (!result) {
      res.status(401).json({ success: false, error: 'Invalid API key' });
      return;
    }

    req.user = result.user;
    req.apiKey = result.apiKey;
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'API key authentication failed' });
  }
};

// Combined Authentication Middleware (JWT or API Key)
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'] as string;

  if (authHeader) {
    // Try JWT authentication
    await authenticateJWT(req, res, next);
  } else if (apiKey) {
    // Try API key authentication
    await authenticateApiKey(req, res, next);
  } else {
    res.status(401).json({ success: false, error: 'No authentication credentials provided' });
  }
};

// Role-based Authorization Middleware
export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

// Permission-based Authorization Middleware
export const requirePermission = (permission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    // If authenticated via API key, check permissions
    if (req.apiKey) {
      if (!req.apiKey.permissions.includes(permission) && !req.apiKey.permissions.includes('*')) {
        res.status(403).json({ success: false, error: `Permission '${permission}' required` });
        return;
      }
    }

    // Admin users have all permissions
    if (req.user.role === 'admin') {
      next();
      return;
    }

    // For JWT authentication, check user role
    if (req.user.role !== 'admin' && req.apiKey && !req.apiKey.permissions.includes(permission)) {
      res.status(403).json({ success: false, error: `Permission '${permission}' required` });
      return;
    }

    next();
  };
};

// Rate Limiting Middleware
export const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      success: false,
      error: options.message || 'Too many requests, please try again later'
    },
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    standardHeaders: true,
    legacyHeaders: false
  });
};

// Predefined rate limiters
export const generalRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP, please try again later'
});

export const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per window
  message: 'Too many authentication attempts, please try again later',
  skipSuccessfulRequests: true
});

export const apiRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: 'API rate limit exceeded, please slow down'
});

// Session-based Authentication Middleware
export const authenticateSession = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sessionToken = req.headers['x-session-token'] as string;
    
    if (!sessionToken) {
      res.status(401).json({ success: false, error: 'No session token provided' });
      return;
    }

    const user = await authService.validateSession(sessionToken);
    
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid or expired session' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Session authentication failed' });
  }
};