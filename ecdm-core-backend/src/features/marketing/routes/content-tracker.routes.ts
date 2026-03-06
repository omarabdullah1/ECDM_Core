import { Router } from 'express';
import * as ctrl from '../controllers/content-tracker.controller';
import { authenticate, authorise } from '../../../middlewares/auth.middleware';
import { UserRole } from '../../auth/auth.types';
import { uploadMarketingFile, handleMarketingFileUpload } from '../../../middlewares/upload.middleware';

/**
 * Content Tracker Routes
 * 
 * Base Path: /api/marketing/content
 * 
 * Routes:
 * - POST   /                    Create new content tracker (multipart/form-data)
 * - GET    /                    Get all content trackers
 * - GET    /:id                 Get content tracker by ID
 * - PUT    /:id                 Update content tracker (multipart/form-data)
 * - PATCH  /:id                 Update content tracker (multipart/form-data)
 * - DELETE /:id                 Delete content tracker
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
    uploadMarketingFile.single('file'),
    handleMarketingFileUpload,
    ctrl.create
);

// ─────────────────────────────────────────────────────────────────────────────
// READ (GET)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE (PUT/PATCH)
// Multer handles multipart/form-data for file upload
// ─────────────────────────────────────────────────────────────────────────────
router.put(
    '/:id',
    uploadMarketingFile.single('file'),
    handleMarketingFileUpload,
    ctrl.update
);

router.patch(
    '/:id',
    uploadMarketingFile.single('file'),
    handleMarketingFileUpload,
    ctrl.update
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', authorise(UserRole.SuperAdmin, UserRole.Manager), ctrl.remove);

export default router;
