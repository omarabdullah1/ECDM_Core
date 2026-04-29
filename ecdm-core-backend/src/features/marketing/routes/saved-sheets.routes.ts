import { Router } from 'express';
import * as savedSheetsController from '../controllers/saved-sheets.controller';
import { authenticate } from '../../../middlewares/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/marketing/saved-sheets
 * Returns all saved connections (without raw JSON)
 */
router.get('/', savedSheetsController.getSavedConnections);

/**
 * GET /api/marketing/saved-sheets/:id
 * Returns a single connection (with raw JSON for sync use)
 */
router.get('/:id', savedSheetsController.getSavedConnectionById);

/**
 * POST /api/marketing/saved-sheets
 * Creates a new saved connection
 */
router.post('/', savedSheetsController.createSavedConnection);

/**
 * DELETE /api/marketing/saved-sheets/:id
 * Deletes a saved connection
 */
router.delete('/:id', savedSheetsController.deleteSavedConnection);

export default router;

