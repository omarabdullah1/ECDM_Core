import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/sales-followup.service';
import { sendSuccess } from '../../../utils/apiResponse';

export const create = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const record = await svc.create(req.body);
        sendSuccess(res, { record }, 'Sales follow-up created', 201);
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
        sendSuccess(res, { record: await svc.getById(String(req.params.id)) });
    } catch (e) {
        next(e);
    }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
    try {
        sendSuccess(res, { record: await svc.update(String(req.params.id), req.body) }, 'Sales follow-up updated');
    } catch (e) {
        next(e);
    }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await svc.remove(String(req.params.id));
        sendSuccess(res, null, 'Sales follow-up deleted');
    } catch (e) {
        next(e);
    }
};

export const bulkDelete = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            res.status(400).json({ success: false, message: 'No IDs provided' });
            return;
        }
        const result = await svc.bulkDelete(ids);
        sendSuccess(res, result, `${result.deletedCount} records deleted`);
    } catch (e) {
        next(e);
    }
};
