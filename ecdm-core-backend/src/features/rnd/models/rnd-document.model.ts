import mongoose, { Schema, Model } from 'mongoose';
import { IRndDocumentDocument } from '../types/rnd-document.types';

/**
 * R&D Document Schema
 * Manages file uploads for R&D projects
 */
const rndDocumentSchema = new Schema<IRndDocumentDocument>(
    {
        fileName: {
            type: String,
            required: [true, 'File name is required'],
            trim: true,
            maxlength: [255, 'File name cannot exceed 255 characters'],
        },
        fileUrl: {
            type: String,
            required: [true, 'File URL is required'],
            trim: true,
        },
        fileType: {
            type: String,
            required: [true, 'File type is required'],
            trim: true,
            maxlength: [100, 'File type cannot exceed 100 characters'],
        },
        projectId: {
            type: Schema.Types.ObjectId,
            ref: 'RndProject',
            required: [true, 'Project reference is required'],
            index: true,
        },
        uploadedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Uploader reference is required'],
            index: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ── Indexes for performance ─────────────────────────────────────────
rndDocumentSchema.index({ projectId: 1, createdAt: -1 });
rndDocumentSchema.index({ uploadedBy: 1, createdAt: -1 });

// ── Model Export ────────────────────────────────────────────────────
const RndDocument: Model<IRndDocumentDocument> = 
    mongoose.models.RndDocument || mongoose.model<IRndDocumentDocument>('RndDocument', rndDocumentSchema);

export default RndDocument;

