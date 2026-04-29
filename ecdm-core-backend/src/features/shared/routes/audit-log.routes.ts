import { Router } from 'express';
import * as ctrl from '../controllers/audit-log.controller';
import { authenticate, authorise } from '../../../middlewares/auth.middleware';
import { UserRole } from '../../auth/auth.types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// All routes are restricted to SuperAdmin and Manager (Admin roles)
router.use(authorise(UserRole.SuperAdmin, UserRole.Admin));

/**
 * @route   GET /api/admin/audit-logs
 * @desc    Get all audit logs with pagination and filtering
 * @access  Admin only
 * @query   page, limit, action, moduleName, userId
 */
router.get('/', ctrl.getAllAuditLogs);

/**
 * @route   GET /api/admin/audit-logs/stats/summary
 * @desc    Get audit log statistics
 * @access  Admin only
 */
router.get('/stats/summary', ctrl.getAuditLogStats);

/**
 * @route   GET /api/admin/audit-logs/:id
 * @desc    Get a single audit log by ID
 * @access  Admin only
 */
router.get('/:id', ctrl.getAuditLogById);

export default router;

