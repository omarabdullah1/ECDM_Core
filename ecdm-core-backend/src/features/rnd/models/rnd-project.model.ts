import mongoose, { Schema, Model } from 'mongoose';
import { IRndProjectDocument, ProjectStatus } from '../types/rnd-project.types';

/**
 * R&D Project Schema
 * Manages research and development projects with team members
 */
const rndProjectSchema = new Schema<IRndProjectDocument>(
    {
        title: {
            type: String,
            required: [true, 'Project title is required'],
            trim: true,
            maxlength: [200, 'Title cannot exceed 200 characters'],
        },
        description: {
            type: String,
            required: [true, 'Project description is required'],
            trim: true,
            maxlength: [2000, 'Description cannot exceed 2000 characters'],
        },
        status: {
            type: String,
            enum: Object.values(ProjectStatus),
            default: ProjectStatus.Planning,
            index: true,
        },
        members: [
            {
                type: Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ── Indexes for performance ─────────────────────────────────────────
rndProjectSchema.index({ createdAt: -1 });
rndProjectSchema.index({ status: 1, createdAt: -1 });

// ── Model Export ────────────────────────────────────────────────────
const RndProject: Model<IRndProjectDocument> = 
    mongoose.models.RndProject || mongoose.model<IRndProjectDocument>('RndProject', rndProjectSchema);

export default RndProject;

