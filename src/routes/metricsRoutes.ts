import { Router } from 'express';
import { MetricsController } from '../controllers/metricsController';
import { authenticate, requirePermission, apiRateLimit } from '../middleware/auth';

const router = Router();
const metricsController = new MetricsController();

// Apply authentication and rate limiting to all routes
router.use(authenticate);
router.use(apiRateLimit);

// Metrics overview endpoints
router.get('/summary', requirePermission('metrics:read'), (req, res) => metricsController.getMetricsSummary(req, res));
router.get('/top-threads', requirePermission('metrics:read'), (req, res) => metricsController.getTopPerformingThreads(req, res));

// Thread-specific metrics
router.get('/thread/:id', requirePermission('metrics:read'), (req, res) => metricsController.getThreadMetrics(req, res));
router.get('/thread/:id/history', requirePermission('metrics:read'), (req, res) => metricsController.getThreadMetricsHistory(req, res));

// Manual metrics collection
router.post('/collect', requirePermission('metrics:collect'), (req, res) => metricsController.collectMetricsManually(req, res));
router.post('/collect/:id', requirePermission('metrics:collect'), (req, res) => metricsController.collectMetricsForThread(req, res));

export default router;