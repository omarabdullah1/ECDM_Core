import { Document, Types } from 'mongoose';

/**
 * R&D Document - represents uploaded files for R&D projects
 */
export interface IRndDocument {
    fileName: string;
    fileUrl: string;
    fileType: string;
    projectId: Types.ObjectId; // Reference to RndProject
    uploadedBy: Types.ObjectId; // Reference to User document
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Mongoose document interface for R&D Document
 */
export interface IRndDocumentDocument extends IRndDocument, Document {
    _id: Types.ObjectId;
}
