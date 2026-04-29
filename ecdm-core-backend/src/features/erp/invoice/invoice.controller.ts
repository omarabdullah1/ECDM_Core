import { Request, Response, NextFunction } from 'express';
import * as invoiceService from './invoice.service';
import { sendSuccess } from '../../../utils/apiResponse';

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, { invoice: await invoiceService.createInvoice(req.body) }, 'Invoice created', 201); }
    catch (err) { next(err); }
};

export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, await invoiceService.getInvoices(req.query)); }
    catch (err) { next(err); }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, { invoice: await invoiceService.getInvoiceById(req.params.id as string) }); }
    catch (err) { next(err); }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, { invoice: await invoiceService.updateInvoice(req.params.id as string, req.body) }, 'Invoice updated'); }
    catch (err) { next(err); }
};

export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { await invoiceService.deleteInvoice(req.params.id as string); sendSuccess(res, null, 'Invoice deleted'); }
    catch (err) { next(err); }
};

