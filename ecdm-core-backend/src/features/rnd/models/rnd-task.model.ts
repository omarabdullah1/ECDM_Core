import mongoose, { Schema, Model } from 'mongoose';
import { IRndTaskDocument, TaskStatus, TaskType } from '../types/rnd-task.types';

/**
 * R&D Task Schema
 * Manages tasks for both personal Kanban boards and project-specific boards
 */
const rndTaskSchema = new Schema<IRndTaskDocument>(
    {
        title: {
            type: String,
            required: [true, 'Task title is required'],
            trim: true,
            maxlength: [200, 'Title cannot exceed 200 characters'],
        },
        description: {
            type: String,
            required: [true, 'Task description is required'],
            trim: true,
            maxlength: [2000, 'Description cannot exceed 2000 characters'],
        },
        status: {
            type: String,
            enum: Object.values(TaskStatus),
            default: TaskStatus.ToDo,
            index: true,
        },
        type: {
            type: String,
            enum: Object.values(TaskType),
            required: [true, 'Task type is required'],
            index: true,
        },
        projectId: {
            type: Schema.Types.ObjectId,
            ref: 'RndProject',
            index: true,
            // Optional: null for Personal tasks, required for Project tasks
        },
        assigneeId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Assignee is required'],
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
rndTaskSchema.index({ assigneeId: 1, type: 1, status: 1 });
rndTaskSchema.index({ projectId: 1, status: 1 });
rndTaskSchema.index({ createdAt: -1 });

// ── Validation: Project tasks must have a projectId ────────────────
rndTaskSchema.pre('save', function (next) {
    if (this.type === TaskType.Project && !this.projectId) {
        return next(new Error('Project tasks must have a projectId'));
    }
    if (this.type === TaskType.Personal && this.projectId) {
        // Clear projectId for Personal tasks
        this.projectId = undefined;
    }
    next();
});

// ── Model Export ────────────────────────────────────────────────────
const RndTask: Model<IRndTaskDocument> = 
    mongoose.models.RndTask || mongoose.model<IRndTaskDocument>('RndTask', rndTaskSchema);

export default RndTask;
