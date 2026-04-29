import { Router } from 'express';
import * as ctrl from '../controllers/sales-followup.controller';
import { authenticate, authorise } from '../../../middlewares/auth.middleware';
import { UserRole } from '../../auth/auth.types';
import { validate } from '../../../middlewares/validate.middleware';
import { createSalesFollowUpSchema, updateSalesFollowUpSchema } from '../validation/sales-followup.validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// CRUD routes
router.post('/',          validate(createSalesFollowUpSchema), ctrl.create);
router.get('/',           ctrl.getAll);
router.get('/:id',        ctrl.getById);
router.patch('/:id',      validate(updateSalesFollowUpSchema), ctrl.update);
router.delete('/:id',     authorise(UserRole.SuperAdmin, UserRole.Admin), ctrl.remove);

// Bulk delete
router.post('/bulk-delete', ctrl.bulkDelete);

export default router;

