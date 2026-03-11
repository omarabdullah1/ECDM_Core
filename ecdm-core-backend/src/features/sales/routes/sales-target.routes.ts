import { Router } from 'express';
import * as ctrl from '../controllers/sales-target.controller';
import { authenticate, authorise } from '../../../middlewares/auth.middleware';
import { validate } from '../../../middlewares/validate.middleware';
import { createSalesTargetSchema, updateSalesTargetSchema } from '../validation/sales-target.validation';
import { UserRole } from '../../auth/auth.types';

const router = Router();
router.use(authenticate);

// Performance endpoint - accessible to sales reps to see their own performance
router.get('/performance', ctrl.getPerformance);

// Target management - restricted to managers and admins
router.post('/',      authorise(UserRole.Manager, UserRole.SuperAdmin), validate(createSalesTargetSchema), ctrl.create);
router.get('/',       authorise(UserRole.Manager, UserRole.SuperAdmin, UserRole.Sales), ctrl.getAll);
router.get('/:id',    authorise(UserRole.Manager, UserRole.SuperAdmin, UserRole.Sales), ctrl.getById);
router.put('/:id',    authorise(UserRole.Manager, UserRole.SuperAdmin), validate(updateSalesTargetSchema), ctrl.update);
router.patch('/:id',  authorise(UserRole.Manager, UserRole.SuperAdmin), validate(updateSalesTargetSchema), ctrl.update);
router.delete('/:id', authorise(UserRole.Manager, UserRole.SuperAdmin), ctrl.remove);

export default router;
