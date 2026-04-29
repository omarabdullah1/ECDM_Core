import { Router } from 'express';
import * as syncController from '../controllers/sync.controller';
import { authenticate, isAdmin } from '../../../middlewares/auth.middleware';

const router = Router();

// All sync routes require authentication
router.use(authenticate);

/**
 * POST /api/marketing/sync/analyze
 * Step 1: Analyze sheet data and categorize into new/exactMatch/conflicts
 */
router.post('/analyze', syncController.analyze);

/**
 * POST /api/marketing/sync/commit
 * Step 2: Commit approved leads and conflict resolutions
 */
router.post('/commit', syncController.commit);

/**
 * POST /api/marketing/sync/bulk-delete
 * Admin-only: Deletes multiple marketing leads by IDs
 */
router.post('/bulk-delete', isAdmin, syncController.bulkDelete);

export default router;

