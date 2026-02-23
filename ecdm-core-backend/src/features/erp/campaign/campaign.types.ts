import { Document, Types } from 'mongoose';

// Advertising/social platform the campaign runs on
export enum CampaignPlatform {
    Google    = 'Google',
    Facebook  = 'Facebook',
    Instagram = 'Instagram',
    LinkedIn  = 'LinkedIn',
    TikTok    = 'TikTok',
    Other     = 'Other',
}

// Temporal lifecycle of the campaign
export enum CampaignStatus {
    Previous = 'Previous', // Campaign has ended
    Current  = 'Current',  // Campaign is running now
    Future   = 'Future',   // Campaign is planned but not started
}

export interface ICampaign {
    name:          string;
    platform:      CampaignPlatform;
    status:        CampaignStatus;
    impressions?:  number;   // Total ad impressions
    conversions?:  number;   // Number of successful conversions
    salesRevenue?: number;   // Revenue attributed to this campaign
    budget?:       number;   // Total campaign budget
    startDate?:    Date;
    endDate?:      Date;
    notes?:        string;
    createdAt:     Date;
    updatedAt:     Date;
}

export interface ICampaignDocument extends ICampaign, Document {
    _id: Types.ObjectId;
    conversionRate?: number; // virtual: conversions / impressions * 100
}
