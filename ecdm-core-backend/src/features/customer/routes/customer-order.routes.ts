import { Router } from 'express';
import * as ctrl from '../controllers/customer-order.controller';
import { authenticate, authorise, isAdmin } from '../../../middlewares/auth.middleware';
import { validate } from '../../../middlewares/validate.middleware';
import { createCustomerOrderSchema, updateCustomerOrderSchema } from '../validation/customer-order.validation';
import { UserRole } from '../../auth/auth.types';

const router = Router();
router.use(authenticate);

router.post('/',           validate(createCustomerOrderSchema), ctrl.create);
router.get('/',            ctrl.getAll);
router.get('/:id',         ctrl.getById);
router.put('/:id',         validate(updateCustomerOrderSchema), ctrl.update);
router.delete('/:id',      authorise(UserRole.SuperAdmin, UserRole.Manager), ctrl.remove);
router.post('/bulk-delete', isAdmin, ctrl.bulkDelete);  // Admin-only bulk delete

export default router;
