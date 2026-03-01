import { Router } from 'express';
import * as ctrl from '../controllers/sales-order.controller';
import { authenticate, authorise, isAdmin } from '../../../middlewares/auth.middleware';
import { validate } from '../../../middlewares/validate.middleware';
import { createSalesOrderSchema, updateSalesOrderSchema } from '../validation/sales-order.validation';
import { UserRole } from '../../auth/auth.types';
import { uploadQuotation, handleQuotationUpload } from '../../../middlewares/upload.middleware';

const router = Router();
router.use(authenticate);

router.post('/',           validate(createSalesOrderSchema), ctrl.create);
router.get('/',            ctrl.getAll);
router.get('/:id',         ctrl.getById);
// File upload routes: Multer handles multipart/form-data, no JSON validation middleware
router.put('/:id',         uploadQuotation.single('quotationFile'), handleQuotationUpload, ctrl.update);
router.patch('/:id',       uploadQuotation.single('quotationFile'), handleQuotationUpload, ctrl.update);
router.delete('/:id',      authorise(UserRole.SuperAdmin, UserRole.Manager), ctrl.remove);
router.post('/bulk-delete', isAdmin, ctrl.bulkDelete);  // Admin-only bulk delete

export default router;
