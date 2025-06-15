import { Router } from 'express';
import { ThreadController } from '../controllers/threadController';
import { authenticate, requirePermission, apiRateLimit } from '../middleware/auth';

const router = Router();
const threadController = new ThreadController();

// Apply authentication and rate limiting to all routes
router.use(authenticate);
router.use(apiRateLimit);

// Thread CRUD operations
router.get('/', requirePermission('threads:read'), (req, res) => threadController.getAllThreads(req, res));
router.get('/:id', requirePermission('threads:read'), (req, res) => threadController.getThread(req, res));
router.post('/', requirePermission('threads:write'), (req, res) => threadController.createThread(req, res));
router.put('/:id', requirePermission('threads:write'), (req, res) => threadController.updateThread(req, res));
router.delete('/:id', requirePermission('threads:delete'), (req, res) => threadController.deleteThread(req, res));

// Thread actions
router.post('/:id/publish', requirePermission('threads:publish'), (req, res) => threadController.publishThread(req, res));
router.post('/:id/schedule', requirePermission('threads:schedule'), (req, res) => threadController.scheduleThread(req, res));

// Thread metrics
router.get('/:id/metrics', requirePermission('metrics:read'), (req, res) => threadController.getThreadMetrics(req, res));

export default router;