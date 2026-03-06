import { Router } from 'express';
import * as ctrl from '../controllers/customer.controller';
import { authenticate, authorise, isAdmin } from '../../../middlewares/auth.middleware';
import { UserRole } from '../../auth/auth.types';

const router = Router();
router.use(authenticate);

// TEMPORARY: Database patch endpoint to fix missing customerIds
router.get('/patch-ids',    isAdmin, ctrl.patchMissingIds);

router.post('/',            ctrl.create);
router.get('/',             ctrl.getAll);
router.get('/:id',          ctrl.getById);
router.get('/:id/history',  ctrl.getHistory);  // History/timeline across all modules
router.get('/:id/report',   ctrl.getReport);   // Customer 360° Report with KPIs and full history
router.put('/:id',          ctrl.update);
router.delete('/:id',       authorise(UserRole.SuperAdmin, UserRole.Manager), ctrl.remove);
router.post('/bulk-delete', isAdmin, ctrl.bulkDelete);  // Admin-only bulk delete

export default router;
