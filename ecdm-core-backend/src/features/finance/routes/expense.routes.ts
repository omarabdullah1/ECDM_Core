import { Router } from 'express';
import * as ctrl from '../controllers/expense.controller';
import { authenticate, authorise } from '../../../middlewares/auth.middleware';
import { validate } from '../../../middlewares/validate.middleware';
import { createExpenseSchema, updateExpenseSchema } from '../validation/expense.validation';
import { UserRole } from '../../auth/auth.types';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// GET all expenses - Admin, Manager, SuperAdmin only
router.get('/', authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.Admin), ctrl.getAll);

// GET single expense by ID - Admin, Manager, SuperAdmin only
router.get('/:id', authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.Admin), ctrl.getById);

// POST create new expense - Admin, Manager, SuperAdmin only
router.post('/', authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.Admin), validate(createExpenseSchema), ctrl.create);

// PUT update expense - Admin, Manager, SuperAdmin only
router.put('/:id', authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.Admin), validate(updateExpenseSchema), ctrl.update);

// DELETE expense - Manager, SuperAdmin only
router.delete('/:id', authorise(UserRole.SuperAdmin, UserRole.Manager), ctrl.remove);

export default router;