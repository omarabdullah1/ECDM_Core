import { Request, Response, NextFunction } from 'express';
import * as leadService from './lead.service';
import { sendSuccess } from '../../../utils/apiResponse';

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, { lead: await leadService.createLead(req.body) }, 'Lead created successfully', 201); }
    catch (err) { next(err); }
};

export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, await leadService.getLeads(req.query)); }
    catch (err) { next(err); }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, { lead: await leadService.getLeadById(req.params.id as string) }); }
    catch (err) { next(err); }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, { lead: await leadService.updateLead(req.params.id as string, req.body) }, 'Lead updated'); }
    catch (err) { next(err); }
};

export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { await leadService.deleteLead(req.params.id as string); sendSuccess(res, null, 'Lead deleted'); }
    catch (err) { next(err); }
};
