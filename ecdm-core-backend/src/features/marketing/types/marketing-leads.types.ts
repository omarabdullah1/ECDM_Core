import { Document, Types } from 'mongoose';

// Channel through which the inbound lead was captured
export enum MarketingLeadSource {
    Web        = 'Web',
    Website    = 'Website',
    Referral   = 'Referral',
    Social     = 'Social',
    Campaign   = 'Campaign',
    Facebook   = 'Facebook',
    Instagram  = 'Instagram',
    TikTok     = 'TikTok',
    Snapchat   = 'Snapchat',
    GoogleAds  = 'GoogleAds',
    WhatsApp   = 'WhatsApp',
    ColdCall   = 'Cold Call',
    Exhibition = 'Exhibition',
    Other      = 'Other',
}

// Lifecycle status of an inbound marketing lead
export enum MarketingLeadStatus {
    New        = 'New',
    Contacted  = 'Contacted',
    Qualified  = 'Qualified',
    Converted  = 'Converted',   // Handed to Sales
    Disqualified = 'Disqualified',
}

export interface IMarketingLead {
    title?:      string;
    contactName: string;
    email?:      string;
    phone?:      string;
    company?:    string;
    source:      MarketingLeadSource;
    status:      MarketingLeadStatus;
    value?:      number;
    // Optional link to a Campaign that generated this lead
    campaign?:   Types.ObjectId;
    // Assigned marketing rep / sales pre-qualifier
    assignedTo?: Types.ObjectId;
    notes?:      string;
    createdAt:   Date;
    updatedAt:   Date;
}

export interface IMarketingLeadDocument extends IMarketingLead, Document {
    _id: Types.ObjectId;
}
