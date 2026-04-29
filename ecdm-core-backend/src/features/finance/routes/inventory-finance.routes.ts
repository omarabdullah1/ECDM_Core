import { Router } from 'express';
import * as ctrl from '../controllers/inventory-finance.controller';
import { validate } from '../../../middlewares/validate.middleware';
import { authenticate, authorise } from '../../../middlewares/auth.middleware';
import { UserRole } from '../../auth/auth.types';
import { createInventoryFinanceSchema, updateInventoryFinanceSchema } from '../validation/inventory-finance.validation';

const router = Router();

// Apply authentication to all routes in this feature
router.use(authenticate);

// GET all inventory finance records - Admin, Manager, SuperAdmin only
router.get('/', authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.Admin), ctrl.getAll);

// GET single inventory finance record by ID - Admin, Manager, SuperAdmin only
router.get('/:id', authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.Admin), ctrl.getById);

// POST create new inventory finance record - Admin, Manager, SuperAdmin only
router.post('/', authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.Admin), validate(createInventoryFinanceSchema), ctrl.create);

// PUT update inventory finance record - Admin, Manager, SuperAdmin only
router.put('/:id', authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.Admin), validate(updateInventoryFinanceSchema), ctrl.update);

// DELETE inventory finance record - Manager, SuperAdmin only
router.delete('/:id', authorise(UserRole.SuperAdmin, UserRole.Admin), ctrl.remove);

// POST generate invoice from Work Order - Admin, Manager, SuperAdmin only
router.post('/generate-invoice/:id', authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.Admin), ctrl.generateInvoice);

export default router;

