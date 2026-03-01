import { Router } from 'express';
import * as ctrl from '../controllers/marketing-leads.controller';
import * as sheetCtrl from '../controllers/google-sheets.controller';
import { authenticate, authorise, isAdmin } from '../../../middlewares/auth.middleware';
import { validate } from '../../../middlewares/validate.middleware';
import { createMarketingLeadSchema, updateMarketingLeadSchema } from '../validation/marketing-leads.validation';
import { UserRole } from '../../auth/auth.types';

const router = Router();

// Public webhook endpoint (no auth required for Google Apps Script)
router.post('/sheet-webhook', sheetCtrl.sheetWebhook);

// Protected routes
router.use(authenticate);

router.post('/',           validate(createMarketingLeadSchema), ctrl.create);
router.get('/',            ctrl.getAll);
router.get('/:id',         ctrl.getById);
router.put('/:id',         validate(updateMarketingLeadSchema), ctrl.update);
router.delete('/:id',      authorise(UserRole.SuperAdmin, UserRole.Manager), ctrl.remove);
router.post('/bulk-delete', isAdmin, ctrl.bulkDelete);  // Admin-only bulk delete

// Google Sheets sync (authenticated)
router.post('/sync-sheet', sheetCtrl.syncSheet);

export default router;
