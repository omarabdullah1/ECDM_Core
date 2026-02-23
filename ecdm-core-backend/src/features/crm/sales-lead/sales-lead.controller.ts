import { Request, Response, NextFunction } from 'express';
import * as svc from './sales-lead.service';
import { sendSuccess } from '../../../utils/apiResponse';

export const create  = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, { salesLead: await svc.createSalesLead(req.body) }, 'Sales lead created', 201); } catch (e) { next(e); } };
export const getAll  = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getSalesLeads(req.query)); } catch (e) { next(e); } };
export const getById = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, { salesLead: await svc.getSalesLeadById(String(req.params.id)) }); } catch (e) { next(e); } };
export const update  = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, { salesLead: await svc.updateSalesLead(String(req.params.id), req.body) }, 'Sales lead updated'); } catch (e) { next(e); } };
export const remove  = async (req: Request, res: Response, next: NextFunction) => { try { await svc.deleteSalesLead(String(req.params.id)); sendSuccess(res, null, 'Sales lead deleted'); } catch (e) { next(e); } };
