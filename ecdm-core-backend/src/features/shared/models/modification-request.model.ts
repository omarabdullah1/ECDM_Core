import mongoose, { Schema, Model } from 'mongoose';
import { IModificationRequestDocument, ModificationRequestStatus, ModuleName } from '../types/modification-request.types';

// ── Schema ──────────────────────────────────────────────────────────
const modificationRequestSchema = new Schema<IModificationRequestDocument>(
    {
        moduleName: {
            type: String,
            required: [true, 'Module name is required'],
            enum: Object.values(ModuleName),
            index: true,
        },
        recordId: {
            type: Schema.Types.ObjectId,
            required: [true, 'Record ID is required'],
            index: true,
        },
        requestedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Requester is required'],
            index: true,
        },
        originalData: {
            type: Schema.Types.Mixed,
            required: [true, 'Original data snapshot is required'],
        },
        proposedData: {
            type: Schema.Types.Mixed,
            required: [true, 'Proposed data is required'],
        },
        status: {
            type: String,
            enum: Object.values(ModificationRequestStatus),
            default: ModificationRequestStatus.Pending,
            index: true,
        },
        reviewedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        reviewNotes: {
            type: String,
            default: '',
            maxlength: [1000, 'Review notes cannot exceed 1000 characters'],
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    },
);

// ── Indexes ─────────────────────────────────────────────────────────
// Compound index for efficient querying by status and date
modificationRequestSchema.index({ status: 1, createdAt: -1 });

// Compound index to prevent duplicate pending requests for same record
modificationRequestSchema.index(
    { moduleName: 1, recordId: 1, status: 1 },
    { 
        unique: true, 
        partialFilterExpression: { status: ModificationRequestStatus.Pending } 
    }
);

// ── Model Export ────────────────────────────────────────────────────
const ModificationRequest: Model<IModificationRequestDocument> = 
    mongoose.models.ModificationRequest || 
    mongoose.model<IModificationRequestDocument>('ModificationRequest', modificationRequestSchema);

export default ModificationRequest;

