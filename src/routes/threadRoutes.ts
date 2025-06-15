import { Router } from 'express';
import { ThreadController } from '../controllers/threadController';

const router = Router();
const threadController = new ThreadController();

// Thread CRUD operations
router.get('/', (req, res) => threadController.getAllThreads(req, res));
router.get('/:id', (req, res) => threadController.getThread(req, res));
router.post('/', (req, res) => threadController.createThread(req, res));
router.put('/:id', (req, res) => threadController.updateThread(req, res));
router.delete('/:id', (req, res) => threadController.deleteThread(req, res));

// Thread actions
router.post('/:id/publish', (req, res) => threadController.publishThread(req, res));
router.post('/:id/schedule', (req, res) => threadController.scheduleThread(req, res));

// Thread metrics
router.get('/:id/metrics', (req, res) => threadController.getThreadMetrics(req, res));

export default router;