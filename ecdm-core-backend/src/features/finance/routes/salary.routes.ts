import { Router } from 'express';
import * as ctrl from '../controllers/salary.controller';
import { authenticate, authorise } from '../../../middlewares/auth.middleware';
import { validate } from '../../../middlewares/validate.middleware';
import { createSalarySchema, updateSalarySchema } from '../validation/salary.validation';
import { UserRole } from '../../auth/auth.types';

const router = Router();

router.use(authenticate);

// CRUD operations - HR, Manager, SuperAdmin only for viewing salary data
router.get('/', authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.HR), ctrl.getAll);
router.get('/stats', authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.HR), ctrl.getStats);
router.get('/preview', authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.HR), ctrl.previewMonthlySalaries);
router.get('/:id', authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.HR), ctrl.getById);
router.get('/employee/:employeeId', authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.HR), ctrl.getByEmployee);
router.post('/', authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.HR), validate(createSalarySchema), ctrl.create);
router.put('/:id', authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.HR), validate(updateSalarySchema), ctrl.update);
router.delete('/:id', authorise(UserRole.SuperAdmin, UserRole.Admin), ctrl.remove);

// Auto-generation endpoints (Finance/HR only)
router.post('/generate/employee', authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.HR), ctrl.generateEmployeeSalary);
router.post('/generate/monthly', authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.HR), ctrl.generateMonthlySalaries);

export default router;

