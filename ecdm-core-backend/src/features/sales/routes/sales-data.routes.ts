import { Router } from 'express';
import * as ctrl from '../controllers/sales-data.controller';
import * as importCtrl from '../controllers/import.controller';
import { authenticate, authorise } from '../../../middlewares/auth.middleware';
import { validate } from '../../../middlewares/validate.middleware';
import { createSalesDataSchema, updateSalesDataSchema } from '../validation/sales-data.validation';
import { UserRole } from '../../auth/auth.types';
import { uploadExcel } from '../../../middlewares/upload.middleware';

const router = Router();
router.use(authenticate);

// Excel Import Routes (2-step process)
router.post('/import/analyze', uploadExcel.single('file'), importCtrl.analyze);
router.post('/import/commit', importCtrl.commit);

// Standard CRUD
router.post('/',      validate(createSalesDataSchema), ctrl.create);
router.get('/',       ctrl.getAll);
router.get('/:id',    ctrl.getById);
router.put('/:id',    validate(updateSalesDataSchema), ctrl.update);
router.post('/bulk-delete', authorise(UserRole.SuperAdmin, UserRole.Manager), ctrl.bulkRemove);
router.delete('/:id', authorise(UserRole.SuperAdmin, UserRole.Manager), ctrl.remove);

export default router;
