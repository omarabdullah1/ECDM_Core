import { Router } from 'express';
import * as ctrl from '../controllers/sales-order.controller';
import { authenticate, authorise } from '../../../middlewares/auth.middleware';
import { validate } from '../../../middlewares/validate.middleware';
import { createSalesOrderSchema, updateSalesOrderSchema } from '../validation/sales-order.validation';
import { UserRole } from '../../auth/auth.types';

const router = Router();
router.use(authenticate);

router.post('/',      validate(createSalesOrderSchema), ctrl.create);
router.get('/',       ctrl.getAll);
router.get('/:id',    ctrl.getById);
router.put('/:id',    validate(updateSalesOrderSchema), ctrl.update);
router.delete('/:id', authorise(UserRole.SuperAdmin, UserRole.Manager), ctrl.remove);

export default router;
