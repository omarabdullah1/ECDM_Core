import { Router } from 'express';
import * as ctrl from '../controllers/expense.controller';
import { authenticate, authorise } from '../../../middlewares/auth.middleware';
import { validate } from '../../../middlewares/validate.middleware';
import { createExpenseSchema, updateExpenseSchema } from '../validation/expense.validation';
import { UserRole } from '../../auth/auth.types';
import { uploadExpenseFile, handleExpenseFileUpload } from '../../../middlewares/upload.middleware';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// GET all expenses - Admin, Manager, SuperAdmin only
router.get('/', authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.Admin), ctrl.getAll);

// GET single expense by ID - Admin, Manager, SuperAdmin only
router.get('/:id', authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.Admin), ctrl.getById);

/**
 * POST /api/finance/expenses
 * Create new expense (supports multipart/form-data for invoice upload)
 */
router.post(
  '/', 
  authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.Admin), 
  uploadExpenseFile.single('invoice'), 
  handleExpenseFileUpload,
  validate(createExpenseSchema), 
  ctrl.create
);

/**
 * PUT /api/finance/expenses/:id
 * Update expense (supports multipart/form-data for invoice upload)
 */
router.put(
  '/:id', 
  authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.Admin), 
  uploadExpenseFile.single('invoice'),
  handleExpenseFileUpload,
  validate(updateExpenseSchema), 
  ctrl.update
);

// DELETE expense - Manager, SuperAdmin only
router.delete('/:id', authorise(UserRole.SuperAdmin, UserRole.Manager), ctrl.remove);

export default router;