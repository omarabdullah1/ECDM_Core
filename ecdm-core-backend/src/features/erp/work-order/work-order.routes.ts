import { Router } from 'express';
import { authenticate, authorise } from '../../../middlewares/auth.middleware';
import { validate } from '../../../middlewares/validate.middleware';
import { createWorkOrderSchema, updateWorkOrderSchema } from './work-order.validation';
import * as ctrl from './work-order.controller';
import { UserRole } from '../../auth/auth.types';

const router = Router();
router.use(authenticate);

router.post('/',   validate(createWorkOrderSchema), ctrl.create);
router.get('/',    ctrl.getAll);
router.get('/:id', ctrl.getById);
router.put('/:id', validate(updateWorkOrderSchema), ctrl.update);
router.delete('/:id', authorise(UserRole.SuperAdmin, UserRole.Manager), ctrl.remove);

export default router;
