import { Document, Types } from 'mongoose';

export enum CampaignPlatform {
    Google    = 'Google',
    Facebook  = 'Facebook',
    Instagram = 'Instagram',
    LinkedIn  = 'LinkedIn',
}

export enum CampaignStatus {
    Previous = 'Previous',
    Current  = 'Current',
    Future   = 'Future',
}

export enum NextSteps {
    Analyse  = 'Analyse',
    Pause    = 'Pause',
    Stop     = 'Stop',
    Continue = 'Continue',
}

export interface ICampaign {
    campaignId:          string;
    campaignName:        string;
    status:              string;
    impressions:         number;
    conversions:         number;
    salesRevenue:        number; // New: Actual sales revenue in currency
    salesRevenuePercent: number; // Keep for backward compatibility
    region1:             string;
    region2:             string;
    region3:             string;
    adSpend:             number; // New: Ad spend amount
    cpa:                 number; // New: Cost per acquisition
    roas:                number; // New: Return on ad spend
    nextSteps:           string;
    fileUrl:             string;
    fileName:            string;
    notes:               string;
    createdBy?:          Types.ObjectId;
    createdAt:           Date;
    updatedAt:           Date;
}

export interface ICampaignDocument extends ICampaign, Document {
    _id: Types.ObjectId;
}

