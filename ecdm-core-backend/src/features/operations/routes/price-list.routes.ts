import { Router } from 'express';
import { authenticate, authorise, isAdmin } from '../../../middlewares/auth.middleware';
import { handleDataSheetUpload, uploadDataSheet } from '../../../middlewares/upload.middleware';
import { UserRole } from '../../auth/auth.types';
import * as ctrl from '../controllers/price-list.controller';

/**
 * Price List Routes
 *
 * Base Path: /api/operations/price-list
 *
 * POST   /                 Create new price list item (multipart/form-data)
 * GET    /                 Get all items (paginated, filterable)
 * GET    /:id              Get item by ID
 * PUT    /:id              Update item (multipart/form-data)
 * PATCH  /:id              Update item (multipart/form-data)
 * DELETE /:id              Delete item (SuperAdmin / Manager)
 * POST   /bulk-delete      Bulk delete (Admin only)
 */

const router = Router();

router.use(authenticate);

// ─── Bulk delete must be declared BEFORE /:id to avoid route clash ────────────
router.post('/bulk-delete', isAdmin, ctrl.bulkDelete);

// ─── CREATE ───────────────────────────────────────────────────────────────────
router.post('/', uploadDataSheet.single('dataSheet'), handleDataSheetUpload, ctrl.create);

// ─── READ ─────────────────────────────────────────────────────────────────────
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);

// ─── UPDATE ───────────────────────────────────────────────────────────────────
router.put('/:id', uploadDataSheet.single('dataSheet'), handleDataSheetUpload, ctrl.update);
router.patch('/:id', uploadDataSheet.single('dataSheet'), handleDataSheetUpload, ctrl.update);

// ─── DELETE ───────────────────────────────────────────────────────────────────
router.delete('/:id', authorise(UserRole.SuperAdmin, UserRole.Manager), ctrl.remove);

export default router;
