import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/customer-order.service';
import { sendSuccess } from '../../../utils/apiResponse';
import { interceptUpdate } from '../../../utils/makerChecker';
import { ModuleName } from '../../shared/types/modification-request.types';
import CustomerOrder from '../models/customer-order.model';
import User from '../../auth/auth.model';

import { AppError } from '../../../utils/apiError';
import { isOperationMember } from '../../../utils/makerChecker';

export const create  = async (req: Request, res: Response, next: NextFunction) => { 
  try { 
    if (isOperationMember(req.user?.role)) {
      throw new AppError('Operation members do not have permission to create records.', 403);
    }
    sendSuccess(res, { order: await svc.create(req.body) }, 'Customer order created', 201); 
  } catch (e) { next(e); } 
};
export const getAll  = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getAll(req.query, req.user)); } catch (e) { next(e); } };
export const getById = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, { order: await svc.getById(String(req.params.id)) }); } catch (e) { next(e); } };

/**
 * PATCH/PUT /api/customer/orders/:id
 * Updates a customer order with operational fields and tracks the updater.
 * 
 * MAKER-CHECKER: Non-admin users will have their updates routed through
 * the approval workflow. Only SuperAdmin/Manager can update directly.
 */
export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (isOperationMember(req.user?.role)) {
      throw new AppError('Operation members do not have permission to modify records. Preview only.', 403);
    }
    // ═══════════════════════════════════════════════════════════════════
    // MAKER-CHECKER INTERCEPTOR
    // Non-admin users submit changes for approval instead of direct update
    // ═══════════════════════════════════════════════════════════════════
    const targetRecord = await CustomerOrder.findById(req.params.id);
    
    if (!targetRecord) {
      return sendSuccess(res, null, 'Customer order not found', 404);
    }
    
    // Prepare the update data
    const updateData: any = {
      ...req.body,
      updatedBy: req.user?.userId,
    };

    const isCS = req.user?.role === 'Customer Service' || req.user?.role === 'CustomerService';
    if (isCS) {
      const userEmail = req.user?.email || (await User.findById(req.user?.userId).select('email').lean())?.email;

      if (targetRecord.csPerson && targetRecord.csPerson !== userEmail) {
        return next(new (require('../../../utils/apiError').AppError)('This record is locked by another Customer Service person. You can only preview it.', 403));
      }
      if (!targetRecord.csPerson && userEmail) {
        updateData.csPerson = userEmail;
      }
    }
    
    const intercepted = await interceptUpdate(
      req,
      res,
      ModuleName.CustomerOrder,
      targetRecord,
      updateData
    );
    
    // If intercepted, response was already sent (202 Accepted)
    if (intercepted) return;
    
    // Admin user: proceed with direct update
    const order = await svc.update(String(req.params.id), updateData);
    sendSuccess(res, { order }, 'Customer order updated');
  } catch (e) {
    next(e);
  }
};

export const remove  = async (req: Request, res: Response, next: NextFunction) => { 
  try { 
    if (isOperationMember(req.user?.role)) {
      throw new AppError('Operation members do not have permission to delete records.', 403);
    }
    await svc.remove(String(req.params.id)); sendSuccess(res, null, 'Customer order deleted'); 
  } catch (e) { next(e); } 
};

/**
 * POST /api/customer/orders/bulk-delete
 * Admin-only: Deletes multiple customer orders by their IDs.
 */
export const bulkDelete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
        sendSuccess(res, { deletedCount: result.deletedCount }, `Successfully deleted ${result.deletedCount} customer orders`);
    } catch (e) {
        next(e);
    }
};

