import { Document, Types } from 'mongoose';

// ── Task status ─────────────────────────────────────────────────────
export enum TaskStatus {
    Todo = 'To-do',
    InProgress = 'In Progress',
    Done = 'Done',
}

// ── Task priority ───────────────────────────────────────────────────
export enum TaskPriority {
    Low = 'Low',
    Medium = 'Medium',
    High = 'High',
    Urgent = 'Urgent',
}

// ── Base interface ──────────────────────────────────────────────────
export interface ITask {
    title: string;
    description?: string;
    status: TaskStatus;
    priority: TaskPriority;
    assignedTo: Types.ObjectId;      // ref → User
    relatedClient?: Types.ObjectId;  // ref → Client
    createdBy: Types.ObjectId;       // ref → User
    dueDate?: Date;
    completedAt?: Date;
    tags?: string[];
    estimatedHours?: number;
    createdAt: Date;
    updatedAt: Date;
}

// ── Mongoose document interface ─────────────────────────────────────
export interface ITaskDocument extends ITask, Document {
    _id: Types.ObjectId;
    isOverdue: boolean; // virtual
}
