import { Request, Response, NextFunction } from 'express';
import * as taskService from './task.service';
import { sendSuccess } from '../../../utils/apiResponse';
import { parsePagination, buildPaginatedResult } from '../../../utils/pagination';

// ── POST /api/erp/tasks ─────────────────────────────────────────────
export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const task = await taskService.createTask(req.body, req.user!.userId);
        sendSuccess(res, { task }, 'Task created successfully', 201);
    } catch (err) {
        next(err);
    }
};

// ── GET /api/erp/tasks ──────────────────────────────────────────────
export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { page, limit, skip } = parsePagination(req.query as Record<string, string>);
        const { tasks, total } = await taskService.getAllTasks(req.query, skip, limit);
        const result = buildPaginatedResult(tasks, total, { page, limit, skip });
        sendSuccess(res, result, 'Tasks retrieved');
    } catch (err) {
        next(err);
    }
};

// ── GET /api/erp/tasks/:id ──────────────────────────────────────────
export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const task = await taskService.getTaskById(req.params.id as string);
        sendSuccess(res, { task }, 'Task retrieved');
    } catch (err) {
        next(err);
    }
};

// ── PUT /api/erp/tasks/:id ──────────────────────────────────────────
export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const task = await taskService.updateTask(req.params.id as string, req.body);
        sendSuccess(res, { task }, 'Task updated successfully');
    } catch (err) {
        next(err);
    }
};

// ── DELETE /api/erp/tasks/:id ───────────────────────────────────────
export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        await taskService.deleteTask(req.params.id as string);
        sendSuccess(res, null, 'Task deleted successfully');
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/erp/tasks/bulk-delete
 * Admin-only: Deletes multiple tasks by their IDs.
 */
export const bulkDelete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { ids } = req.body;
        
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            sendSuccess(res, null, 'Missing or invalid ids array', 400);
            return;
        }
        
        const result = await taskService.bulkDelete(ids);
        sendSuccess(res, { deletedCount: result.deletedCount }, `Successfully deleted ${result.deletedCount} tasks`);
    } catch (err) {
        next(err);
    }
};

