import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/modification-request.service';
import { sendSuccess } from '../../../utils/apiResponse';
import { UserRole } from '../../auth/auth.types';
import { QueryModificationRequestsInput } from '../validation/modification-request.validation';

/**
 * GET /api/admin/modification-requests
 * Get all modification requests with pagination and filtering (Admin only)
 */
export const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const query: QueryModificationRequestsInput = {
            page: req.query.page ? parseInt(String(req.query.page), 10) : 1,
            limit: req.query.limit ? parseInt(String(req.query.limit), 10) : 10,
            status: req.query.status as QueryModificationRequestsInput['status'],
            moduleName: req.query.moduleName as QueryModificationRequestsInput['moduleName'],
        };
        const result = await svc.getAll(query);
        sendSuccess(res, result);
    } catch (e) {
        next(e);
    }
};

/**
 * GET /api/admin/modification-requests/:id
 * Get a single modification request by ID (Admin only)
 */
export const getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const request = await svc.getById(String(req.params.id));
        sendSuccess(res, { request });
    } catch (e) {
        next(e);
    }
};

/**
 * POST /api/admin/modification-requests/:id/review
 * Review (approve/reject) a modification request (Admin only)
 */
export const review = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const request = await svc.review(
            String(req.params.id),
            req.body,
            String(req.user?.userId)
        );
        
        const action = req.body.status === 'Approved' ? 'approved' : 'rejected';
        sendSuccess(res, { request }, `Modification request ${action} successfully`);
    } catch (e) {
        next(e);
    }
};

/**
 * GET /api/admin/modification-requests/pending-count
 * Get count of pending modification requests (for dashboard badges)
 */
export const getPendingCount = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const count = await svc.getPendingCount();
        sendSuccess(res, { count });
    } catch (e) {
        next(e);
    }
};

/**
 * DELETE /api/admin/modification-requests/:id
 * Cancel a pending modification request
 */
export const cancel = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const isAdmin = req.user?.role === UserRole.SuperAdmin || req.user?.role === UserRole.Manager;
        
        await svc.cancel(
            String(req.params.id),
            String(req.user?.userId),
            isAdmin
        );
        
        sendSuccess(res, null, 'Modification request cancelled');
    } catch (e) {
        next(e);
    }
};
