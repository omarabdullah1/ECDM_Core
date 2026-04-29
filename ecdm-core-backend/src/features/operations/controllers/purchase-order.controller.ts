import { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../../../utils/apiResponse';
import { AppError } from '../../../utils/apiError';
import { isOperationMember } from '../../../utils/makerChecker';
import * as svc from '../services/purchase-order.service';

/**
 * PurchaseOrder Controller — HTTP Request Handlers
 */

export const create = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (isOperationMember(req.user?.role)) {
            throw new AppError('Operation members do not have permission to create records.', 403);
        }
        const userId = (req as any).user?.userId || req.user?.userId;
        const item = await svc.create(req.body, userId);
        sendSuccess(res, { item }, 'Purchase order created', 201);
    } catch (e) {
        next(e);
    }
};

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        sendSuccess(res, await svc.getAll(req.query, req.user));
    } catch (e) {
        next(e);
    }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const item = await svc.getById(String(req.params.id));
        sendSuccess(res, { item });
    } catch (e) {
        next(e);
    }
};

export const approveByFinance = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (isOperationMember(req.user?.role)) {
            throw new AppError('Operation members do not have permission to approve records.', 403);
        }
        sendSuccess(res, { item: await svc.approveByFinance(req.params.id, req.user?.userId || '') }, 'Purchase order approved');
    } catch (e) {
        next(e);
    }
};

export const confirmReceipt = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (isOperationMember(req.user?.role)) {
            throw new AppError('Operation members do not have permission to confirm receipts.', 403);
        }
        const userId = (req as any).user?.userId || req.user?.userId;
        const item = await svc.confirmReceipt(String(req.params.id), userId);
        sendSuccess(res, { item }, 'Purchase Order receipt confirmed and stock updated');
    } catch (e) {
        next(e);
    }
};

export const reject = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (isOperationMember(req.user?.role)) {
            throw new AppError('Operation members do not have permission to reject records.', 403);
        }
        const userId = (req as any).user?.userId || req.user?.userId;
        const item = await svc.reject(String(req.params.id), userId);
        sendSuccess(res, { item }, 'Purchase Order rejected');
    } catch (e) {
        next(e);
    }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (isOperationMember(req.user?.role)) {
            throw new AppError('Operation members do not have permission to update records.', 403);
        }
        const item = await svc.update(String(req.params.id), req.body, req.user);
        sendSuccess(res, { item }, 'Purchase Order updated');
    } catch (e) {
        next(e);
    }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (isOperationMember(req.user?.role)) {
            throw new AppError('Operation members do not have permission to delete records.', 403);
        }
        await svc.remove(String(req.params.id));
        sendSuccess(res, null, 'Purchase Order deleted');
    } catch (e) {
        next(e);
    }
};

