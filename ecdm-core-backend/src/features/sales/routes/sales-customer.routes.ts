import { Router } from 'express';
import * as ctrl from '../controllers/sales-customer.controller';
import { authenticate } from '../../../middlewares/auth.middleware';

const router = Router();

// All routes here require authentication
router.use(authenticate);

// GET /api/sales/customers/my-customers
router.get('/my-customers', ctrl.getMyCustomers);

export default router;

