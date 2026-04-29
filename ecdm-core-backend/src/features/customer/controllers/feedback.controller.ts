import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/feedback.service';
import { sendSuccess } from '../../../utils/apiResponse';
import User from '../../auth/auth.model';

export const create  = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, { feedback: await svc.create(req.body) }, 'Feedback created', 201); } catch (e) { next(e); } };
export const getAll  = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getAll(req.query)); } catch (e) { next(e); } };
export const getById = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, { feedback: await svc.getById(String(req.params.id)) }); } catch (e) { next(e); } };
export const update  = async (req: Request, res: Response, next: NextFunction) => { 
    try { 
        const record = await svc.getById(String(req.params.id));
        const user = req.user;
        const updateData = { ...req.body };

        const isCS = user?.role === 'Customer Service' || user?.role === 'CustomerService';
        if (isCS) {
            const userEmail = user?.email || (await User.findById(user?.userId).select('email').lean())?.email;
            
            if (record.csPerson && record.csPerson !== userEmail) {
                return next(new (require('../../../utils/apiError').AppError)('This record is locked by another Customer Service person. You can only preview it.', 403));
            }
            if (!record.csPerson && userEmail) {
                updateData.csPerson = userEmail;
            }
        }

        sendSuccess(res, { feedback: await svc.update(String(req.params.id), updateData) }, 'Feedback updated'); 
    } catch (e) { 
        next(e); 
    } 
};
export const remove  = async (req: Request, res: Response, next: NextFunction) => { try { await svc.remove(String(req.params.id)); sendSuccess(res, null, 'Feedback deleted'); } catch (e) { next(e); } };

/**
 * POST /api/customer/feedback/bulk-delete
 * Admin-only: Deletes multiple feedback records by their IDs.
 */
export const bulkDelete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { ids } = req.body;
        
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            sendSuccess(res, null, 'Missing or invalid ids array', 400);
            return;
        }
        
        const result = await svc.bulkDelete(ids);
        sendSuccess(res, { deletedCount: result.deletedCount }, `Successfully deleted ${result.deletedCount} feedback records`);
    } catch (e) {
        next(e);
    }
};

