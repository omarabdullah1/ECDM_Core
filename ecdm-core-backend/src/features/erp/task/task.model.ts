import mongoose, { Schema, Model } from 'mongoose';
import { ITaskDocument, TaskStatus, TaskPriority } from './task.types';

// ── Schema ──────────────────────────────────────────────────────────
const taskSchema = new Schema<ITaskDocument>(
    {
        title: {
            type: String,
            required: [true, 'Task title is required'],
            trim: true,
            maxlength: [200, 'Title cannot exceed 200 characters'],
        },
        description: {
            type: String,
            maxlength: [3000, 'Description cannot exceed 3000 characters'],
        },
        status: {
            type: String,
            enum: Object.values(TaskStatus),
            default: TaskStatus.Todo,
        },
        priority: {
            type: String,
            enum: Object.values(TaskPriority),
            default: TaskPriority.Medium,
        },
        assignedTo: {
            type: Schema.Types.ObjectId,
            ref: 'Employee',
        },
        relatedClient: {
            type: Schema.Types.ObjectId,
            ref: 'Client',
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Creator is required'],
        },
        dueDate: {
            type: Date,
        },
        completedAt: {
            type: Date,
        },
        tags: {
            type: [String],
            default: [],
        },
        estimatedHours: {
            type: Number,
            min: [0, 'Estimated hours cannot be negative'],
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    },
);

// ── Indexes ─────────────────────────────────────────────────────────
taskSchema.index({ status: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ relatedClient: 1 });
taskSchema.index({ status: 1, assignedTo: 1 }); // compound: tasks by user & status

// ── Virtuals ────────────────────────────────────────────────────────
taskSchema.virtual('isOverdue').get(function (this: ITaskDocument) {
    if (!this.dueDate || this.status === TaskStatus.Done) return false;
    return new Date() > this.dueDate;
});

// ── Pre-save: auto-set completedAt ──────────────────────────────────
taskSchema.pre<ITaskDocument>('save', function (next) {
    if (this.isModified('status') && this.status === TaskStatus.Done && !this.completedAt) {
        this.completedAt = new Date();
    }
    next();
});

// ── Model ───────────────────────────────────────────────────────────
const Task: Model<ITaskDocument> = mongoose.model<ITaskDocument>('Task', taskSchema);

export default Task;
