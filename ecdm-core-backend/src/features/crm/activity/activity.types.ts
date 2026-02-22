import { Document, Types } from 'mongoose';

export enum ActivityType {
    Call = 'Call',
    Email = 'Email',
    Meeting = 'Meeting',
    Note = 'Note',
    Other = 'Other',
}

export interface IActivity {
    type: ActivityType;
    subject: string;
    description?: string;
    relatedClient?: Types.ObjectId;
    relatedLead?: Types.ObjectId;
    performedBy: Types.ObjectId;
    date: Date;
    duration?: number; // minutes
    createdAt: Date;
    updatedAt: Date;
}

export interface IActivityDocument extends IActivity, Document {
    _id: Types.ObjectId;
}
