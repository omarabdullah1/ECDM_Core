import { Document, Types } from 'mongoose';

export enum ProjectStatus {
    Planning = 'Planning',
    Active = 'Active',
    OnHold = 'On Hold',
    Completed = 'Completed',
    Cancelled = 'Cancelled',
}

/**
 * R&D Project - represents a research and development project
 */
export interface IRndProject {
    title: string;
    description: string;
    status: ProjectStatus;
    members: Types.ObjectId[]; // References to User documents
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Mongoose document interface for R&D Project
 */
export interface IRndProjectDocument extends IRndProject, Document {
    _id: Types.ObjectId;
}
