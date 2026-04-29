import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/customer.service';
import { sendSuccess } from '../../../utils/apiResponse';
import User from '../../auth/auth.model';

export const create  = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, { customer: await svc.createCustomer(req.body) }, 'Customer created', 201); } catch (e) { next(e); } };
export const getAll  = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getCustomers(req.query, req.user)); } catch (e) { next(e); } };
export const getById = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, { customer: await svc.getCustomerById(String(req.params.id)) }); } catch (e) { next(e); } };
export const getHistory = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, { history: await svc.getCustomerHistory(String(req.params.id), req.user) }); } catch (e) { next(e); } };
export const getReport = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getCustomerReport(String(req.params.id), req.user)); } catch (e) { next(e); } };

/**
 * PUT /api/shared/customers/:id
 * Admin-only: Update customer details including customerId
 * Handles duplicate customerId errors gracefully
 */
export const update  = async (req: Request, res: Response, next: NextFunction) => { 
    try { 
        const customer = await svc.getCustomerById(String(req.params.id));
        const user = req.user;
        const updateData = { ...req.body };

        const isCS = user?.role === 'Customer Service' || user?.role === 'CustomerService';
        if (isCS) {
            const userEmail = user?.email || (await User.findById(user?.userId).select('email').lean())?.email;
            
            // Lock Check
            if (customer.csPerson && customer.csPerson !== userEmail) {
                return next(new (require('../../../utils/apiError').AppError)('This record is locked by another Customer Service person. You can only preview it.', 403));
            }
            // Auto-assign owner on first edit
            if (!customer.csPerson && userEmail) {
                updateData.csPerson = userEmail;
            }
        }

        sendSuccess(res, { customer: await svc.updateCustomer(String(req.params.id), updateData) }, 'Customer updated'); 
    } catch (e: any) {
        // Handle MongoDB duplicate key error (E11000)
        if (e.code === 11000 && e.keyPattern?.customerId) {
            return next(new (require('../../../utils/apiError').AppError)('This Customer ID already exists. Please use a different ID.', 400));
        }
        if (e.code === 11000 && e.keyPattern?.phone) {
            return next(new (require('../../../utils/apiError').AppError)('This phone number is already registered to another customer.', 400));
        }
        next(e);
    } 
};

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
 * GET /api/shared/customers/next-id
 * Admin-only: Get the next available Customer ID using smart auto-increment
 * 
 * This endpoint uses mathematical analysis of existing IDs to prevent conflicts
 * even when admins manually override IDs.
 */
export const getNextId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const nextId = await svc.getNextCustomerId();
        sendSuccess(res, { nextId }, 'Next available ID generated');
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

