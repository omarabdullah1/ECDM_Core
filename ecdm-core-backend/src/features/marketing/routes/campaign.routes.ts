import { Router } from 'express';
import * as ctrl from '../controllers/campaign.controller';
import { authenticate, authorise } from '../../../middlewares/auth.middleware';
import { UserRole } from '../../auth/auth.types';
import { uploadMarketingFile, handleMarketingFileUpload } from '../../../middlewares/upload.middleware';

/**
 * Campaign Results Routes
 * 
 * Base Path: /api/marketing/campaigns
 * 
 * Routes:
 * - POST   /                    Create new campaign (multipart/form-data)
 * - POST   /sync                Sync campaigns from Google Sheets
 * - GET    /                    Get all campaigns
 * - GET    /:id                 Get campaign by ID
 * - PUT    /:id                 Update campaign (multipart/form-data)
 * - PATCH  /:id                 Update campaign (multipart/form-data)
 * - DELETE /:id                 Delete campaign
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
// SYNC FROM GOOGLE SHEETS (POST /sync)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/sync', (req, res, next) => {
    console.log('🎯 ROUTE HIT: POST /api/marketing/campaigns/sync');
    console.log('Request received at route level');
    next();
}, ctrl.syncFromSheet);

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
router.delete('/:id', authorise(UserRole.SuperAdmin, UserRole.Admin), ctrl.remove);

export default router;

