import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/employee.service';
import { sendSuccess } from '../../../utils/apiResponse';

export const create  = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, { employee: await svc.createEmployee(req.body) }, 'Employee created', 201); } catch (e) { next(e); } };
export const getAll  = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getEmployees(req.query)); } catch (e) { next(e); } };
export const getById = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, { employee: await svc.getEmployeeById(String(req.params.id)) }); } catch (e) { next(e); } };
export const update  = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, { employee: await svc.updateEmployee(String(req.params.id), req.body) }, 'Employee updated'); } catch (e) { next(e); } };
export const remove  = async (req: Request, res: Response, next: NextFunction) => { try { await svc.deleteEmployee(String(req.params.id)); sendSuccess(res, null, 'Employee deleted'); } catch (e) { next(e); } };

/**
 * POST /api/shared/employees/bulk-delete
 * Admin-only: Deletes multiple employees by their IDs.
 */
export const bulkDelete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { ids } = req.body;
        
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            sendSuccess(res, null, 'Missing or invalid ids array', 400);
            return;
        }
        
        const result = await svc.bulkDelete(ids);
        sendSuccess(res, { deletedCount: result.deletedCount }, `Successfully deleted ${result.deletedCount} employees`);
    } catch (e) {
        next(e);
    }
};

