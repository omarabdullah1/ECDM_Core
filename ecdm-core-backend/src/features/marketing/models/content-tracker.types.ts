import { Document, Types } from 'mongoose';

export enum ContentType {
    Email       = 'Email',
    SocialMedia = 'Social media',
    TV          = 'TV',
    BlogPost    = 'Blog post',
    All         = 'All',
}

export enum ContentStatus {
    New         = 'New',
    InProgress  = 'In progress',
    UnderReview = 'Under review',
    Published   = 'Published',
    Suspended   = 'Suspended',
    Paused      = 'Paused',
}

export interface IContentTracker {
    contentId:     string;
    contentTitle:  string;
    type:          ContentType | '';
    details:       string;
    owner:         string;
    status:        ContentStatus | '';
    postDate?:     Date;
    fileUrl:       string;
    fileName:      string;
    notes:         string;
    createdBy?:    Types.ObjectId;
    createdAt:     Date;
    updatedAt:     Date;
}

export interface IContentTrackerDocument extends IContentTracker, Document {
    _id: Types.ObjectId;
}

