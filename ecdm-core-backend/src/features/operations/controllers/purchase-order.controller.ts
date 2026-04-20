import { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../../../utils/apiResponse';
import * as svc from '../services/purchase-order.service';

/**
 * PurchaseOrder Controller — HTTP Request Handlers
 */

export const create = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.userId;
        const item = await svc.create(req.body, userId);
        sendSuccess(res, { item }, 'Purchase Order created', 201);
    } catch (e) {
        next(e);
    }
};

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        sendSuccess(res, await svc.getAll(req.query));
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
        const userId = (req as any).user?.userId;
        const item = await svc.approveByFinance(String(req.params.id), userId);
        sendSuccess(res, { item }, 'Purchase Order approved by Finance');
    } catch (e) {
        next(e);
    }
};

export const confirmReceipt = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.userId;
        const item = await svc.confirmReceipt(String(req.params.id), userId);
        sendSuccess(res, { item }, 'Purchase Order receipt confirmed and stock updated');
    } catch (e) {
        next(e);
    }
};

export const reject = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user?.userId;
        const item = await svc.reject(String(req.params.id), userId);
        sendSuccess(res, { item }, 'Purchase Order rejected');
    } catch (e) {
        next(e);
    }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const item = await svc.update(String(req.params.id), req.body);
        sendSuccess(res, { item }, 'Purchase Order updated');
    } catch (e) {
        next(e);
    }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await svc.remove(String(req.params.id));
        sendSuccess(res, null, 'Purchase Order deleted');
    } catch (e) {
        next(e);
    }
};
