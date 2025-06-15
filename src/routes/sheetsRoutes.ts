import { Router } from 'express';
import { SheetsController } from '../controllers/sheetsController';

const router = Router();
const sheetsController = new SheetsController();

// Google Sheets sync operations
router.post('/sync-from-db', (req, res) => sheetsController.syncFromDatabase(req, res));
router.post('/sync-to-db', (req, res) => sheetsController.syncToDatabase(req, res));
router.post('/bidirectional-sync', (req, res) => sheetsController.bidirectionalSync(req, res));

// Google Sheets data operations  
router.get('/threads', (req, res) => sheetsController.getThreadsFromSheet(req, res));
router.get('/validate', (req, res) => sheetsController.validateConnection(req, res));

export default router;