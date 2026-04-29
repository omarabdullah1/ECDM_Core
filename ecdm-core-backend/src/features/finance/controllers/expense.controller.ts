import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/expense.service';
import { sendSuccess } from '../../../utils/apiResponse';

export const create  = async (req: Request, res: Response, next: NextFunction) => { 
  try { 
    sendSuccess(res, { expense: await svc.create(req.body) }, 'Expense created', 201); 
  } catch (e) { 
    next(e); 
  } 
};

export const getAll  = async (req: Request, res: Response, next: NextFunction) => { 
  try { 
    sendSuccess(res, await svc.getAll(req.query)); 
  } catch (e) { 
    next(e); 
  } 
};

export const getById = async (req: Request, res: Response, next: NextFunction) => { 
  try { 
    sendSuccess(res, { expense: await svc.getById(String(req.params.id)) }); 
  } catch (e) { 
    next(e); 
  } 
};

export const update  = async (req: Request, res: Response, next: NextFunction) => { 
  try { 
    sendSuccess(res, { expense: await svc.update(String(req.params.id), req.body) }, 'Expense updated'); 
  } catch (e) { 
    next(e); 
  } 
};

export const remove  = async (req: Request, res: Response, next: NextFunction) => { 
  try { 
    await svc.remove(String(req.params.id)); 
    sendSuccess(res, null, 'Expense deleted'); 
  } catch (e) { 
    next(e); 
  } 
};

