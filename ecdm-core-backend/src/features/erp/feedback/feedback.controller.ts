import { Request, Response, NextFunction } from 'express';
import * as svc from './feedback.service';
import { sendSuccess } from '../../../utils/apiResponse';

export const create = async (req: Request, res: Response, next: NextFunction) => {
    try { sendSuccess(res, { item: await svc.create(req.body) }, 'Feedback created', 201); }
    catch (e) { next(e); }
};
export const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await svc.getAll(req.query as Record<string, unknown>)); }
    catch (e) { next(e); }
};
export const getById = async (req: Request, res: Response, next: NextFunction) => {
    try { sendSuccess(res, { item: await svc.getById(String(req.params.id)) }); }
    catch (e) { next(e); }
};
export const update = async (req: Request, res: Response, next: NextFunction) => {
    try { sendSuccess(res, { item: await svc.update(String(req.params.id), req.body) }, 'Feedback updated'); }
    catch (e) { next(e); }
};
export const remove = async (req: Request, res: Response, next: NextFunction) => {
    try { await svc.deleteFeedback(String(req.params.id)); sendSuccess(res, null, 'Feedback deleted'); }
    catch (e) { next(e); }
};
