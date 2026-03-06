import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/sales-leads.service';
import { sendSuccess } from '../../../utils/apiResponse';
import { interceptUpdate } from '../../../utils/makerChecker';
import { ModuleName } from '../../shared/types/modification-request.types';
import SalesLead from '../models/sales-lead.model';
import { logAction } from '../../../utils/auditLogger';
import { AuditAction } from '../../shared/types/audit-log.types';
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
// MAKER-CHECKER: Non-admin users submit changes for approval
export const patch = async (req: Request, res: Response, next: NextFunction) => {
    try {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📝 SALES LEAD UPDATE REQUEST');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('Lead ID:', req.params.id);
        console.log('User Role:', req.user?.role);
        console.log('📦 Request Body:', JSON.stringify(req.body, null, 2));
        
        // ═══════════════════════════════════════════════════════════════════
        // MAKER-CHECKER INTERCEPTOR
        // Non-admin users submit changes for approval instead of direct update
        // ═══════════════════════════════════════════════════════════════════
        const targetRecord = await SalesLead.findById(req.params.id);
        
        if (!targetRecord) {
            sendSuccess(res, null, 'Sales lead not found', 404);
            return;
        }
        
        const intercepted = await interceptUpdate(
            req,
            res,
            ModuleName.SalesLead,
            targetRecord,
            req.body
        );
        
        // If intercepted, response was already sent (202 Accepted)
        if (intercepted) {
            console.log('🔒 Non-admin update intercepted - sent to approval queue');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            return;
        }
        
        // Admin user: proceed with direct update
        console.log('✅ Admin user - proceeding with direct update');
        
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
        
        // Log the sales lead update
        await logAction(
            req.user!.userId,
            AuditAction.UPDATE,
            'SalesLead',
            lead._id,
            { leadId: lead._id },
            req,
        );
        
        sendSuccess(res, { lead }, 'Sales lead updated');
        console.log('✅ Sales lead updated successfully');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
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
