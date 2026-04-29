import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/work-order-inventory.integration';
import { sendSuccess, sendError } from '../../../utils/apiResponse';

interface AuthRequest extends Request {
    user?: any;
}

export const addParts = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const { parts } = req.body;
        const performedBy = req.user?._id;

        if (!parts || !Array.isArray(parts) || parts.length === 0) {
            sendError(res, 'parts array is required with inventoryItemId and quantity for each item', 400);
            return;
        }

        const result = await svc.addPartsToWorkOrder(id as string, parts, performedBy);

        sendSuccess(res, {
            workOrder: result.workOrder,
            stockMovementsCount: result.stockMovements.length,
            insufficientStock: result.insufficientStock,
        }, result.insufficientStock.length > 0 
            ? 'Parts added with some stock warnings' 
            : 'Parts added and inventory deducted successfully');

    } catch (e: any) {
        if (e.message.includes('not found')) {
            sendError(res, e.message, 404);
            return;
        }
        if (e.statusCode === 400) {
            sendError(res, e.message, 400);
            return;
        }
        next(e);
    }
};

export const getInventoryCost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const cost = await svc.getWorkOrderInventoryCost(id as string);
        sendSuccess(res, cost);
    } catch (e: any) {
        if (e.message.includes('not found')) {
            sendError(res, e.message, 404);
            return;
        }
        next(e);
    }
};

export const completeWithInventory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const performedBy = req.user?._id;

        const result = await svc.deductInventoryOnCompletion(id as string, performedBy);

        sendSuccess(res, {
            success: result.success,
            message: result.message,
            stockMovementsCount: result.stockMovements?.length || 0,
            actualCost: result.actualCost || 0,
        }, result.message);

    } catch (e: any) {
        if (e.message.includes('not found')) {
            sendError(res, e.message, 404);
            return;
        }
        if (e.statusCode === 400) {
            sendError(res, e.message, 400);
            return;
        }
        next(e);
    }
};

export const getPendingDeductions = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const pending = await svc.getPendingInventoryDeductions();
        sendSuccess(res, { count: pending.length, workOrders: pending });
    } catch (e) {
        next(e);
    }
};

export const rollbackDeduction = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { id } = req.params;
        const performedBy = req.user?._id;

        const result = await svc.rollbackInventoryDeduction(id as string, performedBy);

        sendSuccess(res, {
            success: result.success,
            message: result.message,
            returnedItems: result.returnedItems,
        }, result.message);

    } catch (e: any) {
        if (e.message.includes('not found')) {
            sendError(res, e.message, 404);
            return;
        }
        next(e);
    }
};

