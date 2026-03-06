import { Request } from 'express';
import { Types } from 'mongoose';
import AuditLog from '../features/shared/models/audit-log.model';
import { AuditAction } from '../features/shared/types/audit-log.types';

/**
 * Extract the client's IP address from the request
 * Works with both direct connections and reverse proxies
 */
const getClientIp = (req: Request): string => {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        return (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0]).trim();
    }
    return req.socket.remoteAddress || req.ip || '';
};

/**
 * Log an action to the audit log
 * 
 * @param userId - The ID of the user performing the action (string or ObjectId)
 * @param action - The type of action (CREATE, UPDATE, DELETE, LOGIN, OTHER)
 * @param moduleName - The name of the module/entity (e.g., 'SalesOrder', 'User', 'SparePart')
 * @param recordId - The ID of the affected document (optional)
 * @param details - Additional details about the action (optional)
 * @param req - The Express request object (optional, for IP extraction)
 * 
 * @example
 * // In a controller:
 * await logAction(req.user.userId, AuditAction.UPDATE, 'SalesOrder', orderId, { updatedFields: req.body }, req);
 * 
 * @example
 * // For login:
 * await logAction(user._id, AuditAction.LOGIN, 'User', user._id, { email: user.email }, req);
 */
export const logAction = async (
    userId: string | Types.ObjectId,
    action: AuditAction,
    moduleName: string,
    recordId?: string | Types.ObjectId,
    details: Record<string, any> = {},
    req?: Request,
): Promise<void> => {
    try {
        const ipAddress = req ? getClientIp(req) : '';

        await AuditLog.create({
            userId: new Types.ObjectId(userId),
            action,
            moduleName,
            recordId: recordId ? new Types.ObjectId(recordId) : undefined,
            details,
            ipAddress,
        });
    } catch (error) {
        // Log error but don't throw to avoid disrupting the main operation
        console.error('❌ Audit Log Error:', error);
    }
};

/**
 * Helper function to create a details object for UPDATE actions
 * Captures both old and new values for changed fields
 */
export const createUpdateDetails = (
    oldDoc: Record<string, any>,
    newData: Record<string, any>,
): Record<string, any> => {
    const changes: Record<string, any> = {};

    Object.keys(newData).forEach((key) => {
        if (oldDoc[key] !== newData[key]) {
            changes[key] = {
                from: oldDoc[key],
                to: newData[key],
            };
        }
    });

    return { changes };
};

/**
 * Helper function to create a details object for DELETE actions
 * Captures the state of the document before deletion
 */
export const createDeleteDetails = (doc: Record<string, any>): Record<string, any> => {
    return {
        deletedDocument: {
            ...doc,
            _id: doc._id?.toString(),
        },
    };
};
