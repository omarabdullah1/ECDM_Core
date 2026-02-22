import { Request, Response, NextFunction } from 'express';
import * as service from './stock-movement.service';

export const create = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const movement = await service.createStockMovement(req.body, req.user!.userId);
        res.status(201).json({ success: true, data: movement, message: 'Stock movement recorded' });
    } catch (err) { next(err); }
};

export const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;
        const { movements, total } = await service.getAllStockMovements(req.query, skip, limit);
        res.json({ success: true, data: { data: movements, pagination: { page, limit, total, pages: Math.ceil(total / limit) } }, message: 'OK' });
    } catch (err) { next(err); }
};

export const getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const movement = await service.getStockMovementById(req.params.id);
        res.json({ success: true, data: movement, message: 'OK' });
    } catch (err) { next(err); }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await service.deleteStockMovement(req.params.id);
        res.json({ success: true, data: null, message: 'Stock movement deleted' });
    } catch (err) { next(err); }
};
