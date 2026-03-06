import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/customer.service';
import { sendSuccess } from '../../../utils/apiResponse';

export const create  = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, { customer: await svc.createCustomer(req.body) }, 'Customer created', 201); } catch (e) { next(e); } };
export const getAll  = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getCustomers(req.query)); } catch (e) { next(e); } };
export const getById = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, { customer: await svc.getCustomerById(String(req.params.id)) }); } catch (e) { next(e); } };
export const getHistory = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, { history: await svc.getCustomerHistory(String(req.params.id)) }); } catch (e) { next(e); } };
export const getReport = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getCustomerReport(String(req.params.id))); } catch (e) { next(e); } };
export const update  = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, { customer: await svc.updateCustomer(String(req.params.id), req.body) }, 'Customer updated'); } catch (e) { next(e); } };
export const remove  = async (req: Request, res: Response, next: NextFunction) => { try { await svc.deleteCustomer(String(req.params.id)); sendSuccess(res, null, 'Customer deleted'); } catch (e) { next(e); } };

/**
 * POST /api/shared/customers/bulk-delete
 * Admin-only: Deletes multiple customers by their IDs.
 */
export const bulkDelete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { ids } = req.body;
        
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            sendSuccess(res, null, 'Missing or invalid ids array', 400);
            return;
        }
        
        const result = await svc.bulkDelete(ids);
        sendSuccess(res, { deletedCount: result.deletedCount }, `Successfully deleted ${result.deletedCount} customers`);
    } catch (e) {
        next(e);
    }
};

/**
 * GET /api/shared/customers/patch-ids
 * TEMPORARY DATABASE PATCH ENDPOINT
 * Admin-only: Retroactively fixes customers created without customerId
 * 
 * This endpoint should be called once to fix customers that were created
 * via findOneAndUpdate (which bypassed the pre-save hook that generates IDs)
 */
export const patchMissingIds = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await svc.patchMissingCustomerIds();
        sendSuccess(
            res,
            {
                fixed: result.fixed,
                errors: result.errors,
            },
            `Database patch complete: Fixed ${result.fixed} customer IDs`
        );
    } catch (e) {
        next(e);
    }
};
