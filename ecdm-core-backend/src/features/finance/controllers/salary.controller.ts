import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/salary.service';
import { sendSuccess, sendError } from '../../../utils/apiResponse';

export const create  = async (req: Request, res: Response, next: NextFunction): Promise<void> => { 
  try { 
    sendSuccess(res, { salary: await svc.create(req.body) }, 'Salary created', 201); 
  } catch (e) { 
    next(e); 
  } 
};

export const getAll  = async (req: Request, res: Response, next: NextFunction): Promise<void> => { 
  try { 
    sendSuccess(res, await svc.getAll(req.query)); 
  } catch (e) { 
    next(e); 
  } 
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => { 
  try { 
    sendSuccess(res, { salary: await svc.getById(req.params.id as string) }); 
  } catch (e) { 
    next(e); 
  } 
};

export const update  = async (req: Request, res: Response, next: NextFunction): Promise<void> => { 
  try { 
    sendSuccess(res, { salary: await svc.update(req.params.id as string, req.body) }, 'Salary updated'); 
  } catch (e) { 
    next(e); 
  } 
};

export const remove  = async (req: Request, res: Response, next: NextFunction): Promise<void> => { 
  try { 
    await svc.remove(req.params.id as string); 
    sendSuccess(res, null, 'Salary deleted'); 
  } catch (e) { 
    next(e); 
  } 
};

export const getByEmployee = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    sendSuccess(res, await svc.getByEmployeeId(req.params.employeeId as string, req.query));
  } catch (e) {
    next(e);
  }
};

export const generateEmployeeSalary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { employeeId, month, year, allowances, overtime, bonuses, tax, insurance, notes } = req.body;
    
    if (!employeeId || !month || !year) {
      sendError(res, 'employeeId, month, and year are required', 400);
      return;
    }
    
    const salary = await svc.generateEmployeeSalary({
      employeeId,
      month: Number(month),
      year: Number(year),
      allowances,
      overtime,
      bonuses,
      tax,
      insurance,
      notes,
    });
    
    sendSuccess(res, { salary }, 'Salary generated successfully', 201);
  } catch (e: any) {
    if (e.message.includes('already exists')) {
      sendError(res, e.message, 400);
      return;
    }
    next(e);
  }
};

export const generateMonthlySalaries = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { month, year, department, employeeIds } = req.body;
    
    if (!month || !year) {
      sendError(res, 'month and year are required', 400);
      return;
    }
    
    const results = await svc.generateMonthlySalaries(
      Number(month),
      Number(year),
      { department, employeeIds }
    );
    
    sendSuccess(res, results, `Salary generation completed: ${results.generated} generated, ${results.failed} failed`);
  } catch (e) {
    next(e);
  }
};

export const getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { month, year } = req.query;
    const stats = await svc.getSalaryStats(
      month ? Number(month) : undefined,
      year ? Number(year) : undefined
    );
    sendSuccess(res, { stats });
  } catch (e) {
    next(e);
  }
};

export const previewMonthlySalaries = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      sendError(res, 'month and year query parameters are required (format: ?month=3&year=2026)', 400);
      return;
    }

    const monthNum = Number(month);
    const yearNum = Number(year);

    if (isNaN(monthNum) || isNaN(yearNum)) {
      sendError(res, 'month and year must be valid numbers', 400);
      return;
    }

    if (monthNum < 1 || monthNum > 12) {
      sendError(res, 'month must be between 1 and 12', 400);
      return;
    }

    const result = await svc.previewSalaries(monthNum, yearNum);
    sendSuccess(res, result, `Salary preview for ${monthNum}/${yearNum} retrieved`);
  } catch (e: any) {
    if (e.statusCode === 400) {
      sendError(res, e.message, 400);
      return;
    }
    next(e);
  }
};

