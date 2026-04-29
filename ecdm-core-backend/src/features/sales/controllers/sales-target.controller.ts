import { Request, Response, NextFunction } from 'express';
import * as service from '../services/sales-target.service';
import { sendSuccess } from '../../../utils/apiResponse';

/**
 * Create a new sales target
 */
export const create = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const target = await service.create(req.body);
        sendSuccess(res, target, 'Sales target created successfully', 201);
    } catch (error) {
        next(error);
    }
};

/**
 * Get all sales targets
 */
export const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await service.getAll(req.query);
        sendSuccess(res, result, 'Sales targets retrieved successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Get a single sales target by ID
 */
export const getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const target = await service.getById(String(req.params.id));
        sendSuccess(res, target, 'Sales target retrieved successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Update a sales target
 */
export const update = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const target = await service.update(String(req.params.id), req.body);
        sendSuccess(res, target, 'Sales target updated successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Delete a sales target
 */
export const remove = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await service.remove(String(req.params.id));
        sendSuccess(res, null, 'Sales target deleted successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Calculate performance for a salesperson
 * Query params: salespersonId (required), month (optional), year (optional)
 * Supports both MongoDB _id and employeeId (e.g., EMP-1042)
 */
export const getPerformance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { salespersonId, month, year } = req.query;

        if (!salespersonId) {
            res.status(400).json({
                success: false,
                message: 'Salesperson ID is required',
            });
            return;
        }

        console.log('[SalesTarget] getPerformance called with salespersonId:', salespersonId);

        const performance = await service.calculatePerformance(
            salespersonId as string,
            month ? Number(month) : undefined,
            year ? Number(year) : undefined
        );

        sendSuccess(res, performance, 'Performance calculated successfully');
    } catch (error: any) {
        console.error('[SalesTarget] getPerformance error:', error.message);
        next(error);
    }
};

