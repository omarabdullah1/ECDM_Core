import { Request, Response, NextFunction } from 'express';
import * as employeeService from './employee.service';
import { sendSuccess } from '../../../utils/apiResponse';

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, { employee: await employeeService.createEmployee(req.body) }, 'Employee created', 201); }
    catch (err) { next(err); }
};

export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, await employeeService.getEmployees(req.query)); }
    catch (err) { next(err); }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, { employee: await employeeService.getEmployeeById(req.params.id as string) }); }
    catch (err) { next(err); }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, { employee: await employeeService.updateEmployee(req.params.id as string, req.body) }, 'Employee updated'); }
    catch (err) { next(err); }
};

export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { await employeeService.deleteEmployee(req.params.id as string); sendSuccess(res, null, 'Employee deleted'); }
    catch (err) { next(err); }
};
