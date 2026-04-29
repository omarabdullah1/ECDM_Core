import { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../../../utils/apiResponse';
import * as svc from '../services/inventory.service';

/**
 * Inventory Controller — HTTP Request Handlers
 * Handles file uploads via multer middleware (multipart/form-data)
 */

// ─── CREATE ───────────────────────────────────────────────────────────────────

import { AppError } from '../../../utils/apiError';
import { isOperationMember } from '../../../utils/makerChecker';

export const create = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (isOperationMember(req.user?.role)) {
            throw new AppError('Operation members do not have permission to create records.', 403);
        }
        const item = await svc.create(req.body);
        sendSuccess(res, { item }, 'Inventory item created', 201);
    } catch (e) {
        next(e);
    }
};

// ─── GET ALL ──────────────────────────────────────────────────────────────────

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        sendSuccess(res, await svc.getAll(req.query as Record<string, unknown>, req.user));
    } catch (e) {
        next(e);
    }
};

// ─── GET BY ID ────────────────────────────────────────────────────────────────

export const getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        sendSuccess(res, { item: await svc.getById(String(req.params.id)) });
    } catch (e) {
        next(e);
    }
};

// ─── UPDATE ───────────────────────────────────────────────────────────────────

export const update = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (isOperationMember(req.user?.role)) {
            throw new AppError('Operation members do not have permission to modify records. Preview only.', 403);
        }
        const item = await svc.update(String(req.params.id), req.body);
        sendSuccess(res, { item }, 'Inventory item updated');
    } catch (e) {
        next(e);
    }
};

// ─── DELETE ───────────────────────────────────────────────────────────────────

export const remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (isOperationMember(req.user?.role)) {
            throw new AppError('Operation members do not have permission to delete records.', 403);
        }
        await svc.remove(String(req.params.id));
        sendSuccess(res, null, 'Inventory item deleted');
    } catch (e) {
        next(e);
    }
};

// ─── BULK DELETE ──────────────────────────────────────────────────────────────

export const bulkDelete = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
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
        sendSuccess(
            res,
            { deletedCount: result.deletedCount },
            `Successfully deleted ${result.deletedCount} inventory items`
        );
    } catch (e) {
        next(e);
    }
};

// ─── UPDATE PRICE ─────────────────────────────────────────────────────────────

export const updatePrice = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { pendingUnitPrice } = req.body;
        const item = await svc.updatePrice(String(req.params.id), pendingUnitPrice);
        sendSuccess(res, { item }, 'Proposed price updated');
    } catch (e) {
        next(e);
    }
};

// ─── CONFIRM PRICE ────────────────────────────────────────────────────────────

export const confirmPrice = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const item = await svc.confirmPrice(String(req.params.id), String(req.user?.userId));
        sendSuccess(res, { item }, 'Price confirmed successfully');
    } catch (e) {
        next(e);
    }
};

