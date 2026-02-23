import { Router } from 'express';
import * as ctrl from '../controllers/sales-leads.controller';
import { authenticate, authorise } from '../../../middlewares/auth.middleware';
import { validate } from '../../../middlewares/validate.middleware';
import { createSalesLeadSchema, updateSalesLeadSchema } from '../validation/sales-leads.validation';
import { UserRole } from '../../auth/auth.types';

const router = Router();
router.use(authenticate);

router.post('/',      validate(createSalesLeadSchema), ctrl.create);
router.get('/',       ctrl.getAll);
router.get('/:id',    ctrl.getById);
router.put('/:id',    validate(updateSalesLeadSchema), ctrl.update);
router.delete('/:id', authorise(UserRole.SuperAdmin, UserRole.Manager), ctrl.remove);

export default router;
