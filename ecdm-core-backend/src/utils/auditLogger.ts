import { Request } from 'express';
import { Types } from 'mongoose';
import AuditLog from '../features/shared/models/audit-log.model';
import { AuditAction } from '../features/shared/types/audit-log.types';

const IGNORED_KEYS = ['password', 'token', 'secret', '__v', 'updatedAt', 'createdAt', '_id', 'id'];

/**
 * Extract the client's IP address from the request
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
        console.error('❌ Audit Log Error:', error);
    }
};

/**
 * Aggressive recursive diffing that flattens all changes into dot-notation.
 * Handles nested objects and arrays to ensure human-readable output.
 */
const getDeepChanges = (oldVal: any, newVal: any, prefix = ''): Record<string, any> => {
    const changes: Record<string, any> = {};

    const isSimpleValue = (v: any) => 
        v === null || 
        v === undefined || 
        typeof v !== 'object' || 
        v instanceof Date || 
        v instanceof Types.ObjectId;

    // 1. Both are simple values
    if (isSimpleValue(oldVal) && isSimpleValue(newVal)) {
        if (String(oldVal) !== String(newVal)) {
            changes[prefix] = { from: oldVal, to: newVal };
        }
        return changes;
    }

    // 2. Both are arrays
    if (Array.isArray(oldVal) || Array.isArray(newVal)) {
        const oldArr = Array.isArray(oldVal) ? oldVal : [];
        const newArr = Array.isArray(newVal) ? newVal : [];
        
        // If lengths are different or content changed, we drill down or summarize
        const maxLength = Math.max(oldArr.length, newArr.length);
        for (let i = 0; i < maxLength; i++) {
            const nested = getDeepChanges(oldArr[i], newArr[i], `${prefix}[${i}]`);
            Object.assign(changes, nested);
        }
        return changes;
    }

    // 3. Both are objects (or one is and other is missing)
    const oldObj = (oldVal && typeof oldVal === 'object') ? oldVal : {};
    const newObj = (newVal && typeof newVal === 'object') ? newVal : {};
    
    // Get unique keys from both (case-insensitive approach would be too slow, sticking to keys)
    const keys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
    
    keys.forEach(key => {
        if (IGNORED_KEYS.includes(key)) return;
        
        const nestedPrefix = prefix ? `${prefix}.${key}` : key;
        const nestedChanges = getDeepChanges(oldObj[key], newObj[key], nestedPrefix);
        Object.assign(changes, nestedChanges);
    });

    return changes;
};

/**
 * Entry point for creating update details.
 * Compares two documents and returns a flattened map of all field-level changes.
 */
export const createUpdateDetails = (
    oldDoc: Record<string, any>,
    newData: Record<string, any>,
): Record<string, any> => {
    // Convert Mongoose/Lean docs to plain objects if needed
    const oldObj = JSON.parse(JSON.stringify(oldDoc));
    const newObj = JSON.parse(JSON.stringify(newData));

    const changes = getDeepChanges(oldObj, newObj);
    
    return { changes };
};

/**
 * Helper function to create a details object for DELETE actions
 */
export const createDeleteDetails = (doc: Record<string, any>): Record<string, any> => {
    return {
        deletedDocument: {
            ...doc,
            _id: doc._id?.toString(),
        },
    };
};

