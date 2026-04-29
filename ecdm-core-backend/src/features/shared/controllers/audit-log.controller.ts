import { Request, Response, NextFunction } from 'express';
import AuditLog from '../models/audit-log.model';
import { sendSuccess } from '../../../utils/apiResponse';
import { parsePagination, buildPaginatedResult } from '../../../utils/pagination';
import { AppError } from '../../../utils/apiError';

/**
 * @route   GET /api/admin/audit-logs
 * @desc    Get all audit logs with pagination and filtering
 * @access  Admin only (SuperAdmin, Manager)
 * @query   page, limit, action, moduleName, userId
 */
export const getAllAuditLogs = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const { page, limit, skip } = parsePagination(req.query as Record<string, string>);

        // Build filter
        const filter: Record<string, any> = {};

        if (req.query.action) {
            filter.action = req.query.action;
        }

        if (req.query.moduleName) {
            filter.moduleName = req.query.moduleName;
        }

        if (req.query.userId) {
            filter.userId = req.query.userId;
        }

        // Execute query with population
        const logs = await AuditLog.find(filter)
            .populate('userId', 'firstName lastName email role')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await AuditLog.countDocuments(filter);

        const result = buildPaginatedResult(logs, total, { page, limit, skip });

        sendSuccess(res, result, 'Audit logs retrieved successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/admin/audit-logs/:id
 * @desc    Get a single audit log by ID
 * @access  Admin only (SuperAdmin, Manager)
 */
export const getAuditLogById = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const log = await AuditLog.findById(req.params.id)
            .populate('userId', 'firstName lastName email role')
            .lean();

        if (!log) {
            throw new AppError('Audit log not found', 404);
        }

        sendSuccess(res, { log }, 'Audit log retrieved successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * @route   GET /api/admin/audit-logs/stats/summary
 * @desc    Get audit log statistics
 * @access  Admin only (SuperAdmin, Manager)
 */
export const getAuditLogStats = async (
    _req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    try {
        const [
            totalLogs,
            actionStats,
            moduleStats,
        ] = await Promise.all([
            AuditLog.countDocuments(),
            AuditLog.aggregate([
                { $group: { _id: '$action', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ]),
            AuditLog.aggregate([
                { $group: { _id: '$moduleName', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 },
            ]),
        ]);

        sendSuccess(
            res,
            {
                totalLogs,
                byAction: actionStats.map((s) => ({ action: s._id, count: s.count })),
                byModule: moduleStats.map((s) => ({ module: s._id, count: s.count })),
            },
            'Audit log statistics retrieved successfully',
        );
    } catch (error) {
        next(error);
    }
};

