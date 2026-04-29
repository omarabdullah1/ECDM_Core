import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/work-order.service';
import { sendSuccess } from '../../../utils/apiResponse';
import { interceptUpdate } from '../../../utils/makerChecker';
import { ModuleName } from '../../shared/types/modification-request.types';
import WorkOrder from '../models/work-order.model';

import { AppError } from '../../../utils/apiError';
import { isOperationMember } from '../../../utils/makerChecker';

export const create = async (req: Request, res: Response, next: NextFunction) => {
    try { 
        if (isOperationMember(req.user?.role)) {
            throw new AppError('Operation members do not have permission to create records.', 403);
        }
        sendSuccess(res, { item: await svc.create(req.body) }, 'Work order created', 201); 
    }
    catch (e) { next(e); }
};
export const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await svc.getAll(req.query as Record<string, unknown>, req.user)); }
    catch (e) { next(e); }
};
export const getById = async (req: Request, res: Response, next: NextFunction) => {
    try { sendSuccess(res, { item: await svc.getById(String(req.params.id)) }); }
    catch (e) { next(e); }
};

/**
 * PATCH/PUT /api/operations/work-orders/:id
 * 
 * MAKER-CHECKER: Non-admin users will have their updates routed through
 * the approval workflow. Only SuperAdmin/Manager can update directly.
 */
export const update = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (isOperationMember(req.user?.role)) {
            throw new AppError('Operation members do not have permission to modify records. Preview only.', 403);
        }
        const targetRecord = await WorkOrder.findById(req.params.id);
        
        if (!targetRecord) {
            return sendSuccess(res, null, 'Work order not found', 404);
        }
        
        const intercepted = await interceptUpdate(
            req,
            res,
            ModuleName.WorkOrder,
            targetRecord,
            req.body
        );
        
        if (intercepted) return;
        
        sendSuccess(res, { item: await svc.update(String(req.params.id), req.body) }, 'Work order updated');
    }
    catch (e) { next(e); }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
    try { 
        if (isOperationMember(req.user?.role)) {
            throw new AppError('Operation members do not have permission to delete records.', 403);
        }
        await svc.deleteWorkOrder(String(req.params.id)); sendSuccess(res, null, 'Work order deleted'); 
    }
    catch (e) { next(e); }
};

/**
 * POST /api/operations/work-orders/bulk-delete
 * Admin-only: Deletes multiple work orders by their IDs.
 */
export const bulkDelete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (isOperationMember(req.user?.role)) {
            throw new AppError('Operation members do not have permission to delete records.', 403);
        }
        const { ids } = req.body;
        
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            sendSuccess(res, null, 'Missing or invalid ids array', 400);
            return;
        }
        
        const result = await svc.bulkDelete(ids);
        sendSuccess(res, { deletedCount: result.deletedCount }, `Successfully deleted ${result.deletedCount} work orders`);
    } catch (e) {
        next(e);
    }
};

