import { Router } from 'express';
import * as ctrl from './activity.controller';
import { authenticate } from '../../../middlewares/auth.middleware';
import { validate } from '../../../middlewares/validate.middleware';
import { createActivitySchema, updateActivitySchema } from './activity.validation';

const router = Router();
router.use(authenticate);

router.post('/', validate(createActivitySchema), ctrl.create);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.put('/:id', validate(updateActivitySchema), ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;
