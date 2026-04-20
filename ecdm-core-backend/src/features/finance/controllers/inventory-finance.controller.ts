import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/inventory-finance.service';
import { sendSuccess } from '../../../utils/apiResponse';

export const create  = async (req: Request, res: Response, next: NextFunction) => { 
  try { 
    sendSuccess(res, { inventory: await svc.create(req.body) }, 'Inventory finance record created', 201); 
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
    sendSuccess(res, { inventory: await svc.getById(String(req.params.id)) }); 
  } catch (e) { 
    next(e); 
  } 
};

export const update  = async (req: Request, res: Response, next: NextFunction) => { 
  try { 
    sendSuccess(res, { inventory: await svc.update(String(req.params.id), req.body) }, 'Inventory finance record updated'); 
  } catch (e) { 
    next(e); 
  } 
};

export const remove  = async (req: Request, res: Response, next: NextFunction) => { 
  try { 
    await svc.remove(String(req.params.id)); 
    sendSuccess(res, null, 'Inventory finance record deleted'); 
  } catch (e) { 
    next(e); 
  } 
};

export const generateInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { targetInvoiceId } = req.body;
    const result = await svc.generateInvoiceForWorkOrder(String(req.params.id), targetInvoiceId);
    sendSuccess(res, result, 'Invoice processed successfully from Work Order');
  } catch (e) {
    next(e);
  }
};