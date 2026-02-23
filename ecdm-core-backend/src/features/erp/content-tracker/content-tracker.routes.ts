import { Router } from 'express';
import { authenticate, authorise } from '../../../middlewares/auth.middleware';
import { validate } from '../../../middlewares/validate.middleware';
import { createContentTrackerSchema, updateContentTrackerSchema } from './content-tracker.validation';
import * as ctrl from './content-tracker.controller';
import { UserRole } from '../../auth/auth.types';

const router = Router();
router.use(authenticate);

router.post('/',   validate(createContentTrackerSchema), ctrl.create);
router.get('/',    ctrl.getAll);
router.get('/:id', ctrl.getById);
router.put('/:id', validate(updateContentTrackerSchema), ctrl.update);
router.delete('/:id', authorise(UserRole.SuperAdmin, UserRole.Manager), ctrl.remove);

export default router;
