import { Router } from 'express';
import * as invoiceController from '../controllers/invoice.controller';
import { authenticate } from '../../../middlewares/auth.middleware';
import { validate } from '../../../middlewares/validate.middleware';
import { createInvoiceSchema, updateInvoiceSchema } from '../validation/invoice.validation';

const router = Router();

console.log('[DEBUG] invoice.routes.ts (finance) loaded');

router.use(authenticate);

router.post('/generate-invoice', invoiceController.generateFromOrder);

router.get('/', invoiceController.getInvoices);
router.post('/', validate(createInvoiceSchema), invoiceController.createInvoice);

router.get('/:id', invoiceController.getInvoiceById);
router.patch('/:id', validate(updateInvoiceSchema), invoiceController.updateInvoice);
router.delete('/:id', invoiceController.deleteInvoice);

router.post('/:id/approve', invoiceController.approveInvoice);
router.post('/:id/payments', invoiceController.addPayment);

export default router;
