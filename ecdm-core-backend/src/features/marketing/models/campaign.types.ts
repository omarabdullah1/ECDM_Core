import { Document, Types } from 'mongoose';

export enum CampaignPlatform {
    Google    = 'Google',
    Facebook  = 'Facebook',
    Instagram = 'Instagram',
    LinkedIn  = 'LinkedIn',
    TikTok    = 'TikTok',
    Other     = 'Other',
}

export enum CampaignStatus {
    Previous = 'Previous',
    Current  = 'Current',
    Future   = 'Future',
}

export interface ICampaign {
    name:          string;
    platform:      CampaignPlatform;
    status:        CampaignStatus;
    impressions?:  number;
    conversions?:  number;
    salesRevenue?: number;
    budget?:       number;
    startDate?:    Date;
    endDate?:      Date;
    notes?:        string;
    createdAt:     Date;
    updatedAt:     Date;
}

export interface ICampaignDocument extends ICampaign, Document {
    _id: Types.ObjectId;
    conversionRate?: number;
}
