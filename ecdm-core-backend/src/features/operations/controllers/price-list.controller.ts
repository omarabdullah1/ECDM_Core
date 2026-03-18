import { NextFunction, Request, Response } from 'express';
import { sendSuccess } from '../../../utils/apiResponse';
import * as svc from '../services/price-list.service';

/**
 * PriceList Controller — HTTP Request Handlers
 * Handles file uploads via multer middleware (multipart/form-data)
 */

// ─── CREATE ───────────────────────────────────────────────────────────────────

export const create = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const item = await svc.create(req.body);
        sendSuccess(res, { item }, 'Price list item created', 201);
    } catch (e) {
        next(e);
    }
};

// ─── GET ALL ──────────────────────────────────────────────────────────────────

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        sendSuccess(res, await svc.getAll(req.query as Record<string, unknown>));
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
        const item = await svc.update(String(req.params.id), req.body);
        sendSuccess(res, { item }, 'Price list item updated');
    } catch (e) {
        next(e);
    }
};

// ─── DELETE ───────────────────────────────────────────────────────────────────

export const remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await svc.remove(String(req.params.id));
        sendSuccess(res, null, 'Price list item deleted');
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
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            sendSuccess(res, null, 'Missing or invalid ids array', 400);
            return;
        }
        const result = await svc.bulkDelete(ids);
        sendSuccess(
            res,
            { deletedCount: result.deletedCount },
            `Successfully deleted ${result.deletedCount} price list items`
        );
    } catch (e) {
        next(e);
    }
};
