import { Router } from 'express';
import { authenticate, authorise } from '../../../middlewares/auth.middleware';
import { validate } from '../../../middlewares/validate.middleware';
import { createReportSchema, updateReportSchema } from '../validation/report.validation';
import * as ctrl from '../controllers/report.controller';
import * as evalCtrl from '../controllers/employee-evaluation.controller';
import { UserRole } from '../../auth/auth.types';

const router = Router();
router.use(authenticate);

// CRUD operations
router.post('/',       validate(createReportSchema), ctrl.create);
router.get('/',        ctrl.getAll);
router.get('/auto',    ctrl.getAutomated);
router.get('/:id',     ctrl.getById);
router.put('/:id',    validate(updateReportSchema), ctrl.update);
router.delete('/:id', authorise(UserRole.SuperAdmin, UserRole.Admin), ctrl.remove);

// Employee Evaluation Integration endpoints
router.post('/auto-generate', authorise(UserRole.SuperAdmin, UserRole.Admin, UserRole.Manager, UserRole.HR), evalCtrl.autoGenerate);
router.post('/generate-bulk', authorise(UserRole.SuperAdmin, UserRole.Admin, UserRole.Manager, UserRole.HR), evalCtrl.generateBulk);
router.get('/summary/:userId', evalCtrl.getSummary);
router.get('/metrics/:userId', evalCtrl.getMetrics);

export default router;

