import { Router } from 'express';
import { authenticate, authorise } from '../../../middlewares/auth.middleware';
import { validate } from '../../../middlewares/validate.middleware';
import { createReportSchema, updateReportSchema } from '../validation/report.validation';
import * as ctrl from '../controllers/report.controller';
import { UserRole } from '../../auth/auth.types';

const router = Router();
router.use(authenticate);

router.post('/',      validate(createReportSchema), ctrl.create);
router.get('/',       ctrl.getAll);
router.get('/:id',    ctrl.getById);
router.put('/:id',    validate(updateReportSchema), ctrl.update);
router.delete('/:id', authorise(UserRole.SuperAdmin, UserRole.Manager), ctrl.remove);

export default router;
