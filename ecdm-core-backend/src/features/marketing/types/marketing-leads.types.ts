import { Document, Types } from 'mongoose';

// Re-export Contact types for convenience
export { ContactType, ContactSector } from '../../shared/types/contact.types';

// Legacy enums kept for backward compatibility with existing data
export enum MarketingLeadType {
    Google     = 'Google',
    Facebook   = 'Facebook',
    Instagram  = 'Instagram',
    TikTok     = 'TikTok',
    Snapchat   = 'Snapchat',
    WhatsApp   = 'WhatsApp',
    Website    = 'Website',
    Referral   = 'Referral',
    ColdCall   = 'Cold Call',
    Exhibition = 'Exhibition',
    Other      = 'Other',
}

// Legacy enum - use ContactSector from shared types for new code
export enum MarketingLeadSector {
    B2B    = 'B2B',
    B2C    = 'B2C',
    B2G    = 'B2G',
    Hybrid = 'Hybrid',
    Other  = 'Other',
}

// Legacy enums kept for backward compatibility
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

export enum MarketingLeadStatus {
    New        = 'New',
    Contacted  = 'Contacted',
    Qualified  = 'Qualified',
    Converted  = 'Converted',
    Disqualified = 'Disqualified',
}

/**
 * MarketingLead - Module-specific data for marketing pipeline
 * References Customer for demographic data (SSOT)
 * Uses Customer.customerId as the global human-readable ID
 */
export interface IMarketingLead {
    customerId:  Types.ObjectId;   // Reference to Customer (SSOT)
    date:        Date;             // Lead date
    status:      MarketingLeadStatus;
    // Marketing-specific fields
    source?:     MarketingLeadSource;
    campaign?:   Types.ObjectId;   // Reference to Campaign
    assignedTo?: Types.ObjectId;   // Reference to User
    value?:      number;           // Lead value estimate
    notes?:      string;
    // Legacy fields for backward compatibility (deprecated - use customerId)
    title?:      string;
    contactName?: string;
    email?:      string;
    company?:    string;
    createdAt:   Date;
    updatedAt:   Date;
}

export interface IMarketingLeadDocument extends IMarketingLead, Document {
    _id: Types.ObjectId;
}

// Google Sheets sync configuration
export interface ISheetSyncConfig {
    spreadsheetId: string;
    sheetRange: string;
    serviceAccountJson: string;
}
