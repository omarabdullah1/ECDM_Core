import { Router } from 'express';
import * as ctrl from '../controllers/modification-request.controller';
import { authenticate, authorise } from '../../../middlewares/auth.middleware';
import { validate } from '../../../middlewares/validate.middleware';
import { reviewRequestSchema } from '../validation/modification-request.validation';
import { UserRole } from '../../auth/auth.types';

const router = Router();

// All routes require authentication
router.use(authenticate);

// All routes are restricted to SuperAdmin and Manager (Admin roles)
router.use(authorise(UserRole.SuperAdmin, UserRole.Manager));

/**
 * @route   GET /api/admin/modification-requests
 * @desc    Get all modification requests with pagination and filtering
 * @access  Admin only
 * @query   page, limit, status, moduleName
 */
router.get('/', ctrl.getAll);

/**
 * @route   GET /api/admin/modification-requests/pending-count
 * @desc    Get count of pending modification requests
 * @access  Admin only
 */
router.get('/pending-count', ctrl.getPendingCount);

/**
 * @route   GET /api/admin/modification-requests/:id
 * @desc    Get a single modification request by ID
 * @access  Admin only
 */
router.get('/:id', ctrl.getById);

/**
 * @route   POST /api/admin/modification-requests/:id/review
 * @desc    Review (approve/reject) a modification request
 * @access  Admin only
 * @body    { status: 'Approved' | 'Rejected', reviewNotes?: string }
 */
router.post('/:id/review', validate(reviewRequestSchema), ctrl.review);

/**
 * @route   DELETE /api/admin/modification-requests/:id
 * @desc    Cancel a pending modification request
 * @access  Admin only (or request owner)
 */
router.delete('/:id', ctrl.cancel);

export default router;
