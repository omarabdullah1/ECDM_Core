import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/sales-data.service';
import { sendSuccess } from '../../../utils/apiResponse';

export const create  = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, { record: await svc.create(req.body) }, 'Sales data record created', 201); } catch (e) { next(e); } };
export const getAll  = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getAll(req.query)); } catch (e) { next(e); } };
export const getById = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, { record: await svc.getById(String(req.params.id)) }); } catch (e) { next(e); } };
export const update  = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, { record: await svc.update(String(req.params.id), req.body) }, 'Sales data record updated'); } catch (e) { next(e); } };
export const remove  = async (req: Request, res: Response, next: NextFunction) => { try { await svc.remove(String(req.params.id)); sendSuccess(res, null, 'Sales data record deleted'); } catch (e) { next(e); } };
export const bulkRemove = async (req: Request, res: Response, next: NextFunction) => { try { const result = await svc.bulkRemove(req.body.ids); sendSuccess(res, result, 'Selected records deleted'); } catch (e) { next(e); } };
