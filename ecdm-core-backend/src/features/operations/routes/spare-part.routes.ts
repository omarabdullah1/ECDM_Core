import { Router } from 'express';
import * as ctrl from '../controllers/spare-part.controller';
import { authenticate, authorise, isAdmin } from '../../../middlewares/auth.middleware';
import { UserRole } from '../../auth/auth.types';
import { uploadDataSheet, handleDataSheetUpload } from '../../../middlewares/upload.middleware';

/**
 * Spare Parts Routes
 * 
 * Base Path: /api/operations/spare-parts
 * 
 * Routes:
 * - POST   /                    Create new spare part (multipart/form-data)
 * - GET    /                    Get all spare parts (paginated)
 * - GET    /categories          Get unique categories for filter dropdown
 * - GET    /:id                 Get spare part by ID
 * - PUT    /:id                 Update spare part (multipart/form-data)
 * - PATCH  /:id                 Update spare part (multipart/form-data)
 * - DELETE /:id                 Delete spare part
 * - POST   /bulk-delete         Bulk delete (Admin only)
 */

const router = Router();

// All routes require authentication
router.use(authenticate);

// ─────────────────────────────────────────────────────────────────────────────
// CREATE (POST)
// Multer handles multipart/form-data, no JSON validation middleware
// ─────────────────────────────────────────────────────────────────────────────
router.post(
    '/',
    uploadDataSheet.single('dataSheet'),
    handleDataSheetUpload,
    ctrl.create
);

// ─────────────────────────────────────────────────────────────────────────────
// READ (GET)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', ctrl.getAll);
router.get('/categories', ctrl.getCategories);
router.get('/:id', ctrl.getById);

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE (PUT/PATCH)
// Multer handles multipart/form-data for file upload
// ─────────────────────────────────────────────────────────────────────────────
router.put(
    '/:id',
    uploadDataSheet.single('dataSheet'),
    handleDataSheetUpload,
    ctrl.update
);

router.patch(
    '/:id',
    uploadDataSheet.single('dataSheet'),
    handleDataSheetUpload,
    ctrl.update
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', authorise(UserRole.SuperAdmin, UserRole.Manager), ctrl.remove);

// ─────────────────────────────────────────────────────────────────────────────
// BULK DELETE (Admin only)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/bulk-delete', isAdmin, ctrl.bulkDelete);

export default router;
