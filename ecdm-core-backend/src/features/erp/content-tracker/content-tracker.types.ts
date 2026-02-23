import { Document, Types } from 'mongoose';

// Platform/channel the content piece targets
export enum ContentType {
    Google    = 'Google',
    Facebook  = 'Facebook',
    Instagram = 'Instagram',
    LinkedIn  = 'LinkedIn',
    TikTok    = 'TikTok',
    Other     = 'Other',
}

// Production/publish lifecycle of the content asset
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
    sector?:   string;   // Target market sector (B2B / B2C / B2G or free-form)
    postDate?: Date;     // Scheduled or actual publish date
    notes?:    string;
    createdAt: Date;
    updatedAt: Date;
}

export interface IContentTrackerDocument extends IContentTracker, Document {
    _id: Types.ObjectId;
}
