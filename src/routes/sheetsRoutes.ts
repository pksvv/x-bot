import { Router } from 'express';
import { SheetsController } from '../controllers/sheetsController';
import { authenticate, requirePermission, apiRateLimit } from '../middleware/auth';

const router = Router();
const sheetsController = new SheetsController();

// Apply authentication and rate limiting to all routes
router.use(authenticate);
router.use(apiRateLimit);

// Google Sheets sync operations
router.post('/sync-from-db', requirePermission('sheets:sync'), (req, res) => sheetsController.syncFromDatabase(req, res));
router.post('/sync-to-db', requirePermission('sheets:sync'), (req, res) => sheetsController.syncToDatabase(req, res));
router.post('/bidirectional-sync', requirePermission('sheets:sync'), (req, res) => sheetsController.bidirectionalSync(req, res));

// Google Sheets data operations  
router.get('/threads', requirePermission('sheets:read'), (req, res) => sheetsController.getThreadsFromSheet(req, res));
router.get('/validate', requirePermission('sheets:read'), (req, res) => sheetsController.validateConnection(req, res));

export default router;