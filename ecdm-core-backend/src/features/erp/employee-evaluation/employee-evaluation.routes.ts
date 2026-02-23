import { Router } from 'express';
import { authenticate, authorise } from '../../../middlewares/auth.middleware';
import { validate } from '../../../middlewares/validate.middleware';
import { createEmployeeEvaluationSchema, updateEmployeeEvaluationSchema } from './employee-evaluation.validation';
import * as ctrl from './employee-evaluation.controller';
import { UserRole } from '../../auth/auth.types';

const router = Router();
router.use(authenticate);

router.post('/',   validate(createEmployeeEvaluationSchema), ctrl.create);
router.get('/',    ctrl.getAll);
router.get('/:id', ctrl.getById);
router.put('/:id', validate(updateEmployeeEvaluationSchema), ctrl.update);
router.delete('/:id', authorise(UserRole.SuperAdmin, UserRole.Manager), ctrl.remove);

export default router;
