import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/follow-up.service';
import { sendSuccess } from '../../../utils/apiResponse';

export const create  = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, { followUp: await svc.create(req.body) }, 'Follow-up created', 201); } catch (e) { next(e); } };
export const getAll  = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getAll(req.query)); } catch (e) { next(e); } };
export const getById = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, { followUp: await svc.getById(String(req.params.id)) }); } catch (e) { next(e); } };
export const update  = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, { followUp: await svc.update(String(req.params.id), req.body) }, 'Follow-up updated'); } catch (e) { next(e); } };
export const remove  = async (req: Request, res: Response, next: NextFunction) => { try { await svc.remove(String(req.params.id)); sendSuccess(res, null, 'Follow-up deleted'); } catch (e) { next(e); } };

/**
 * POST /api/customer/follow-ups/bulk-delete
 * Admin-only: Deletes multiple follow-up records by their IDs.
 */
export const bulkDelete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { ids } = req.body;
        
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            sendSuccess(res, null, 'Missing or invalid ids array', 400);
            return;
        }
        
        const result = await svc.bulkDelete(ids);
        sendSuccess(res, { deletedCount: result.deletedCount }, `Successfully deleted ${result.deletedCount} follow-up records`);
    } catch (e) {
        next(e);
    }
};
