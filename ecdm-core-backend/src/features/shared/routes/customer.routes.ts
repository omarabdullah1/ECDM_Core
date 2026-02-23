import { Router } from 'express';
import * as ctrl from '../controllers/customer.controller';
import { authenticate, authorise } from '../../../middlewares/auth.middleware';
import { validate } from '../../../middlewares/validate.middleware';
import { createCustomerSchema, updateCustomerSchema } from '../validation/customer.validation';
import { UserRole } from '../../auth/auth.types';

const router = Router();
router.use(authenticate);

router.post('/',      validate(createCustomerSchema), ctrl.create);
router.get('/',       ctrl.getAll);
router.get('/:id',    ctrl.getById);
router.put('/:id',    validate(updateCustomerSchema), ctrl.update);
router.delete('/:id', authorise(UserRole.SuperAdmin, UserRole.Manager), ctrl.remove);

export default router;
