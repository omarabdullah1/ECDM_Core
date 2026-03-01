import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/sales-leads.service';
import { sendSuccess } from '../../../utils/apiResponse';
import User from '../../auth/auth.model';

export const create  = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, { lead: await svc.create(req.body) }, 'Sales lead created', 201); } catch (e) { next(e); } };
export const getAll  = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getAll(req.query)); } catch (e) { next(e); } };
export const getById = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, { lead: await svc.getById(String(req.params.id)) }); } catch (e) { next(e); } };

// PUT update (legacy) - does not auto-track salesPerson
export const update  = async (req: Request, res: Response, next: NextFunction) => { 
    try { 
        sendSuccess(res, { lead: await svc.update(String(req.params.id), req.body) }, 'Sales lead updated'); 
    } catch (e) { next(e); } 
};

// PATCH update - auto-tracks salesPerson from logged-in user
export const patch = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Get user info from authentication middleware
        let userInfo: { email?: string; name?: string } | undefined;
        
        if (req.user?.userId) {
            const user = await User.findById(req.user.userId).select('email firstName lastName').lean();
            if (user) {
                userInfo = {
                    email: user.email,
                    name: `${user.firstName} ${user.lastName}`.trim(),
                };
            }
        }

        const lead = await svc.update(String(req.params.id), req.body, userInfo);
        sendSuccess(res, { lead }, 'Sales lead updated');
    } catch (e) { 
        next(e); 
    }
};

export const remove  = async (req: Request, res: Response, next: NextFunction) => { try { await svc.remove(String(req.params.id)); sendSuccess(res, null, 'Sales lead deleted'); } catch (e) { next(e); } };

/**
 * POST /api/sales/leads/bulk-delete
 * Admin-only: Deletes multiple sales leads by their IDs.
 */
export const bulkDelete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { ids } = req.body;
        
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            sendSuccess(res, null, 'Missing or invalid ids array', 400);
            return;
        }
        
        const result = await svc.bulkDelete(ids);
        sendSuccess(res, { deletedCount: result.deletedCount }, `Successfully deleted ${result.deletedCount} leads`);
    } catch (e) {
        next(e);
    }
};
