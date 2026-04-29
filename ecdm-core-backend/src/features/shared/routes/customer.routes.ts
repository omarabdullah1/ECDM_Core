import { Router } from 'express';
import * as ctrl from '../controllers/customer.controller';
import { authenticate, authorise, isAdmin } from '../../../middlewares/auth.middleware';
import { UserRole } from '../../auth/auth.types';

const router = Router();
router.use(authenticate);

// TEMPORARY: Database patch endpoint to fix missing customerIds
router.get('/patch-ids',    isAdmin, ctrl.patchMissingIds);

// Smart Auto-Increment: Get next available Customer ID
router.get('/next-id',      isAdmin, ctrl.getNextId);

// Customer creation - Admin, Manager, SuperAdmin, Sales, Marketing, CS allowed
router.post('/',            authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.Admin, UserRole.Sales, UserRole.Marketing, UserRole.CustomerService), ctrl.create);
router.get('/my-customers', (req, res, next) => { req.query.my = 'true'; ctrl.getAll(req, res, next); });
router.get('/',             ctrl.getAll);
router.get('/:id',          ctrl.getById);
router.get('/:id/history',  ctrl.getHistory);  // History/timeline across all modules
router.get('/:id/report',   ctrl.getReport);   // Customer 360° Report with KPIs and full history
router.put('/:id',          authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.Admin, UserRole.CustomerService), ctrl.update);
router.patch('/:id',        authorise(UserRole.SuperAdmin, UserRole.Manager, UserRole.Admin, UserRole.CustomerService), ctrl.update);
router.delete('/:id',       authorise(UserRole.SuperAdmin, UserRole.Admin), ctrl.remove);
router.post('/bulk-delete', isAdmin, ctrl.bulkDelete);  // Admin-only bulk delete

export default router;

