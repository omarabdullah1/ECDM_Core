import { Request, Response, NextFunction } from 'express';
import * as activityService from './activity.service';
import { sendSuccess } from '../../../utils/apiResponse';

export const create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, { activity: await activityService.createActivity(req.body, req.user!.userId) }, 'Activity created', 201); }
    catch (err) { next(err); }
};

export const getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, await activityService.getActivities(req.query)); }
    catch (err) { next(err); }
};

export const getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, { activity: await activityService.getActivityById(req.params.id as string) }); }
    catch (err) { next(err); }
};

export const update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { sendSuccess(res, { activity: await activityService.updateActivity(req.params.id as string, req.body) }, 'Activity updated'); }
    catch (err) { next(err); }
};

export const remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { await activityService.deleteActivity(req.params.id as string); sendSuccess(res, null, 'Activity deleted'); }
    catch (err) { next(err); }
};
