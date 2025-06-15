import { Router } from 'express';
import { simpleMonitoringController } from '../controllers/SimpleMonitoringController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// Public health check endpoints (for load balancers, monitoring systems)
router.get('/health', simpleMonitoringController.healthCheck);
router.get('/ping', simpleMonitoringController.ping);

// Protected admin endpoints
router.use(authenticate);
router.use(requireRole(['admin']));

// Basic system info (admin only)
router.get('/system', simpleMonitoringController.getSystemInfo);

export default router;