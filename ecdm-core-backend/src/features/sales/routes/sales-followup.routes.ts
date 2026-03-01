import { Router } from 'express';
import * as ctrl from '../controllers/sales-followup.controller';
import { authenticate } from '../../../middlewares/auth.middleware';
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
router.delete('/:id',     ctrl.remove);

// Bulk delete
router.post('/bulk-delete', ctrl.bulkDelete);

export default router;
