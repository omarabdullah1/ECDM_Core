import { Document, Types } from 'mongoose';

export enum ContentType {
    Google    = 'Google',
    Facebook  = 'Facebook',
    Instagram = 'Instagram',
    LinkedIn  = 'LinkedIn',
    TikTok    = 'TikTok',
    Other     = 'Other',
}

export enum ContentStatus {
    New        = 'New',
    InProgress = 'In progress',
    Published  = 'Published',
    Paused     = 'Paused',
}

export interface IContentTracker {
    name:      string;
    type:      ContentType;
    status:    ContentStatus;
    sector?:   string;
    postDate?: Date;
    notes?:    string;
    createdAt: Date;
    updatedAt: Date;
}

export interface IContentTrackerDocument extends IContentTracker, Document {
    _id: Types.ObjectId;
}
