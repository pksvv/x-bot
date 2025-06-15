import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authenticate, authRateLimit, requireRole } from '../middleware/auth';

const router = Router();
const authController = new AuthController();

// Public routes (with rate limiting)
router.post('/register', authRateLimit, AuthController.getRegisterValidation(), authController.register);
router.post('/login', authRateLimit, AuthController.getLoginValidation(), authController.login);
router.get('/health', authController.healthCheck);

// Protected routes (require authentication)
router.use(authenticate); // All routes below require authentication

router.get('/profile', authController.getProfile);
router.post('/logout', authController.logout);

// API key management
router.post('/api-keys', AuthController.getApiKeyValidation(), authController.createApiKey);
router.get('/api-keys', authController.listApiKeys);
router.delete('/api-keys/:keyId', authController.revokeApiKey);

// Admin only routes
router.post('/cleanup-sessions', requireRole(['admin']), authController.cleanupSessions);

export default router;