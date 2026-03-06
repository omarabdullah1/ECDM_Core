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
    status:              CampaignStatus | '';
    impressions:         number;
    conversions:         number;
    salesRevenuePercent: number;
    region1:             string;
    region2:             string;
    region3:             string;
    nextSteps:           NextSteps | '';
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
