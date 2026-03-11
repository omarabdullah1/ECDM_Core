import { Document, Types } from 'mongoose';

export enum TaskStatus {
    ToDo = 'To Do',
    InProgress = 'In Progress',
    Done = 'Done',
}

export enum TaskType {
    Personal = 'Personal',
    Project = 'Project',
}

/**
 * R&D Task - represents a task in the Kanban board (personal or project-specific)
 */
export interface IRndTask {
    title: string;
    description: string;
    status: TaskStatus;
    type: TaskType;
    projectId?: Types.ObjectId; // Optional reference to RndProject (null for Personal tasks)
    assigneeId: Types.ObjectId; // Reference to User document
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Mongoose document interface for R&D Task
 */
export interface IRndTaskDocument extends IRndTask, Document {
    _id: Types.ObjectId;
}
