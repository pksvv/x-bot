import { Router } from 'express';
import { MonitoringController } from '../controllers/MonitoringController';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();
const monitoringController = new MonitoringController();

// Public health check endpoints (for load balancers, monitoring systems)
router.get('/health', monitoringController.healthCheck);
router.get('/ping', monitoringController.ping);

// Public metrics endpoint (for Prometheus scraping)
router.get('/metrics', monitoringController.getMetrics);

// Protected admin endpoints
router.use(authenticate);
router.use(requireRole(['admin']));

// Detailed monitoring endpoints (admin only)
router.get('/system', monitoringController.getSystemInfo);
router.get('/metrics/summary', monitoringController.getMetricsSummary);
router.get('/analytics/logs', monitoringController.getLogAnalytics);
router.get('/analytics/performance', monitoringController.getPerformanceMetrics);
router.get('/analytics/security', monitoringController.getSecurityMetrics);
router.get('/analytics/business', monitoringController.getBusinessMetrics);

export default router;