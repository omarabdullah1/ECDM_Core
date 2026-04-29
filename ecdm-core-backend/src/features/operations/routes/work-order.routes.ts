import { Router } from 'express';
import { authenticate, authorise, isAdmin } from '../../../middlewares/auth.middleware';
import { validate } from '../../../middlewares/validate.middleware';
import { createWorkOrderSchema, updateWorkOrderSchema } from '../validation/work-order.validation';
import * as ctrl from '../controllers/work-order.controller';
import * as invCtrl from '../controllers/work-order-inventory.controller';
import { UserRole } from '../../auth/auth.types';

const router = Router();
router.use(authenticate);

// CRUD operations
router.post('/',           validate(createWorkOrderSchema), ctrl.create);
router.get('/',            ctrl.getAll);
router.get('/:id',         ctrl.getById);
router.put('/:id',         authorise(UserRole.SuperAdmin, UserRole.Admin, UserRole.Manager, UserRole.Operations, UserRole.Maintenance), validate(updateWorkOrderSchema), ctrl.update);
router.delete('/:id',      authorise(UserRole.SuperAdmin, UserRole.Admin), ctrl.remove);
router.post('/bulk-delete', isAdmin, ctrl.bulkDelete);  // Admin-only bulk delete

// Inventory Integration endpoints
router.post('/:id/parts', authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.Operations), invCtrl.addParts);
router.get('/:id/inventory-cost', invCtrl.getInventoryCost);
router.post('/:id/complete', authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.Operations), invCtrl.completeWithInventory);
router.get('/pending-inventory', authorise(UserRole.SuperAdmin, UserRole.Manager), invCtrl.getPendingDeductions);
router.post('/:id/rollback-inventory', authorise(UserRole.SuperAdmin, UserRole.Manager), invCtrl.rollbackDeduction);

export default router;

