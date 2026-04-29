import { Router } from 'express';
import * as ctrl from '../controllers/purchase-order.controller';
import { authenticate, authorise } from '../../../middlewares/auth.middleware';
import { UserRole } from '../../auth/auth.types';

const router = Router();

// All routes require authentication
router.use(authenticate);

router.route('/')
    .get(ctrl.getAll)
    .post(ctrl.create);

router.route('/:id')
    .get(ctrl.getById)
    .patch(ctrl.update)
    .delete(ctrl.remove);

// Admin Approval - Restricted to Admins only
router.patch('/:id/finance-approve', 
    authorise(UserRole.Admin, UserRole.SuperAdmin), 
    ctrl.approveByFinance
);

// Confirm Receipt - Restricted to Operations, MaintenanceEngineer, and Admins
router.patch('/:id/confirm-receipt', 
    authorise(UserRole.Operations, UserRole.MaintenanceEngineer, UserRole.Admin, UserRole.SuperAdmin), 
    ctrl.confirmReceipt
);

router.patch('/:id/reject', 
    authorise(UserRole.Operations, UserRole.Admin, UserRole.SuperAdmin), 
    ctrl.reject
);

export default router;

