import { Router } from 'express';
import { authenticate, authorise } from '../../../middlewares/auth.middleware';
import { validate } from '../../../middlewares/validate.middleware';
import { createInventoryItemSchema, updateInventoryItemSchema } from './inventory-item.validation';
import * as ctrl from './inventory-item.controller';
import { UserRole } from '../../auth/auth.types';

const router = Router();
router.use(authenticate);

router.post('/',   validate(createInventoryItemSchema), ctrl.create);
router.get('/',    ctrl.getAll);
router.get('/:id', ctrl.getById);
router.put('/:id', validate(updateInventoryItemSchema), ctrl.update);
router.delete('/:id', authorise(UserRole.SuperAdmin, UserRole.Manager), ctrl.remove);

export default router;
