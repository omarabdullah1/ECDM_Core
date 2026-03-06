import mongoose, { Schema, Model } from 'mongoose';
import { IAuditLogDocument, AuditAction } from '../types/audit-log.types';

const auditLogSchema = new Schema<IAuditLogDocument>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        action: {
            type: String,
            enum: Object.values(AuditAction),
            required: true,
            index: true,
        },
        moduleName: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        recordId: {
            type: Schema.Types.ObjectId,
            index: true,
        },
        details: {
            type: Schema.Types.Mixed,
            default: {},
        },
        ipAddress: {
            type: String,
            default: '',
            trim: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    },
);

// Index for efficient querying by date (most recent first)
auditLogSchema.index({ createdAt: -1 });

// Compound index for filtering by user and action
auditLogSchema.index({ userId: 1, action: 1 });

// Compound index for filtering by module and action
auditLogSchema.index({ moduleName: 1, action: 1 });

const AuditLog: Model<IAuditLogDocument> = mongoose.model<IAuditLogDocument>('AuditLog', auditLogSchema);
export default AuditLog;
