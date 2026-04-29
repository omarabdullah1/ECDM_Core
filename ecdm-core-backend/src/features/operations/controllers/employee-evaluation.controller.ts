import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/employee-evaluation.integration';
import { sendSuccess, sendError } from '../../../utils/apiResponse';

export const autoGenerate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { userId, startDate, endDate, notes, overrideExisting } = req.body;

        if (!userId || !startDate || !endDate) {
            sendError(res, 'userId, startDate, and endDate are required', 400);
            return;
        }

        const result = await svc.autoGenerateEvaluation(
            userId,
            new Date(startDate),
            new Date(endDate),
            { notes, overrideExisting }
        );

        sendSuccess(res, {
            report: result.report,
            metrics: result.metrics,
        }, 'Evaluation report generated successfully', 201);

    } catch (e: any) {
        if (e.message.includes('already exists') || e.message.includes('not found')) {
            sendError(res, e.message, 400);
            return;
        }
        next(e);
    }
};

export const generateBulk = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { startDate, endDate, department, userIds } = req.body;

        if (!startDate || !endDate) {
            sendError(res, 'startDate and endDate are required', 400);
            return;
        }

        const results = await svc.generateBulkEvaluations(
            new Date(startDate),
            new Date(endDate),
            { department, userIds }
        );

        sendSuccess(res, results, `Bulk generation completed: ${results.generated} generated, ${results.failed} failed`);

    } catch (e) {
        next(e);
    }
};

export const getSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { userId } = req.params;
        const summary = await svc.getEvaluationSummary(userId as string);
        sendSuccess(res, summary);
    } catch (e: any) {
        if (e.message.includes('not found')) {
            sendError(res, e.message, 404);
            return;
        }
        next(e);
    }
};

export const getMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { userId } = req.params;
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            sendError(res, 'startDate and endDate query parameters are required', 400);
            return;
        }

        const metrics = await svc.calculateEvaluationMetrics(
            userId as string,
            new Date(startDate as string),
            new Date(endDate as string)
        );

        sendSuccess(res, { metrics });

    } catch (e: any) {
        if (e.message.includes('not found')) {
            sendError(res, e.message, 404);
            return;
        }
        next(e);
    }
};

