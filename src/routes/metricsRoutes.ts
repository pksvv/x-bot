import { Router } from 'express';
import { MetricsController } from '../controllers/metricsController';

const router = Router();
const metricsController = new MetricsController();

// Metrics overview endpoints
router.get('/summary', (req, res) => metricsController.getMetricsSummary(req, res));
router.get('/top-threads', (req, res) => metricsController.getTopPerformingThreads(req, res));

// Thread-specific metrics
router.get('/thread/:id', (req, res) => metricsController.getThreadMetrics(req, res));
router.get('/thread/:id/history', (req, res) => metricsController.getThreadMetricsHistory(req, res));

// Manual metrics collection
router.post('/collect', (req, res) => metricsController.collectMetricsManually(req, res));
router.post('/collect/:id', (req, res) => metricsController.collectMetricsForThread(req, res));

export default router;