import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/customer-order.service';
import { sendSuccess } from '../../../utils/apiResponse';

export const create  = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, { order: await svc.create(req.body) }, 'Customer order created', 201); } catch (e) { next(e); } };
export const getAll  = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getAll(req.query)); } catch (e) { next(e); } };
export const getById = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, { order: await svc.getById(String(req.params.id)) }); } catch (e) { next(e); } };

/**
 * PATCH/PUT /api/customer/orders/:id
 * Updates a customer order with operational fields and tracks the updater.
 */
export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Inject updatedBy from authenticated user
    const updateData = {
      ...req.body,
      updatedBy: req.user?._id, // Track who made the update
    };
    
    const order = await svc.update(String(req.params.id), updateData);
    sendSuccess(res, { order }, 'Customer order updated');
  } catch (e) {
    next(e);
  }
};

export const remove  = async (req: Request, res: Response, next: NextFunction) => { try { await svc.remove(String(req.params.id)); sendSuccess(res, null, 'Customer order deleted'); } catch (e) { next(e); } };

/**
 * POST /api/customer/orders/bulk-delete
 * Admin-only: Deletes multiple customer orders by their IDs.
 */
export const bulkDelete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
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
