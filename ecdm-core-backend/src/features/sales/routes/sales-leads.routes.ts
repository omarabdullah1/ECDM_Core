import { Router } from 'express';
import * as ctrl from '../controllers/sales-leads.controller';
import { authenticate, authorise, isAdmin } from '../../../middlewares/auth.middleware';
import { validate } from '../../../middlewares/validate.middleware';
import { createSalesLeadSchema, updateSalesLeadSchema } from '../validation/sales-leads.validation';
import { UserRole } from '../../auth/auth.types';

const router = Router();
router.use(authenticate);

router.post('/',           authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.Sales, UserRole.Marketing), validate(createSalesLeadSchema), ctrl.create);
router.get('/',            authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.Sales, UserRole.Marketing), ctrl.getAll);
router.get('/:id',         authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.Sales, UserRole.Marketing), ctrl.getById);
router.put('/:id',         authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.Sales, UserRole.Marketing), validate(updateSalesLeadSchema), ctrl.update);
router.patch('/:id',       authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.Sales, UserRole.Marketing), validate(updateSalesLeadSchema), ctrl.patch);  // Auto-tracks salesPerson
router.delete('/:id',      authorise(UserRole.SuperAdmin, UserRole.Manager), ctrl.remove);
router.post('/bulk-delete', isAdmin, ctrl.bulkDelete);  // Admin-only bulk delete

export default router;
