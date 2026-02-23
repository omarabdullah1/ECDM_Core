import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/customer.service';
import { sendSuccess } from '../../../utils/apiResponse';

export const create  = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, { customer: await svc.createCustomer(req.body) }, 'Customer created', 201); } catch (e) { next(e); } };
export const getAll  = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, await svc.getCustomers(req.query)); } catch (e) { next(e); } };
export const getById = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, { customer: await svc.getCustomerById(String(req.params.id)) }); } catch (e) { next(e); } };
export const update  = async (req: Request, res: Response, next: NextFunction) => { try { sendSuccess(res, { customer: await svc.updateCustomer(String(req.params.id), req.body) }, 'Customer updated'); } catch (e) { next(e); } };
export const remove  = async (req: Request, res: Response, next: NextFunction) => { try { await svc.deleteCustomer(String(req.params.id)); sendSuccess(res, null, 'Customer deleted'); } catch (e) { next(e); } };
