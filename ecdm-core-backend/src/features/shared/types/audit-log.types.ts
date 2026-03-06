import { Document, Types } from 'mongoose';

// ── Audit Log Actions ───────────────────────────────────────────────
export enum AuditAction {
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
    LOGIN = 'LOGIN',
    OTHER = 'OTHER',
}

// ── Base interface (plain data shape) ───────────────────────────────
export interface IAuditLog {
    userId: Types.ObjectId;
    action: AuditAction;
    moduleName: string;
    recordId?: Types.ObjectId;
    details: Record<string, any>;
    ipAddress: string;
    createdAt: Date;
    updatedAt: Date;
}

// ── Mongoose document interface ─────────────────────────────────────
export interface IAuditLogDocument extends IAuditLog, Document {
    _id: Types.ObjectId;
}
