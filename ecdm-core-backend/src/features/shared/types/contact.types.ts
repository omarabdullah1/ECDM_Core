import { Document, Types } from 'mongoose';

/**
 * Customer Type - Lead source/channel
 * (Aliased as ContactType for backward compatibility)
 */
export enum CustomerType {
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
    Direct     = 'Direct',
    Other      = 'Other',
}

/**
 * Customer Sector - Business classification
 * (Aliased as ContactSector for backward compatibility)
 */
export enum CustomerSector {
    B2B    = 'B2B',
    B2C    = 'B2C',
    B2G    = 'B2G',
    Hybrid = 'Hybrid',
    Other  = 'Other',
}

// Backward compatibility aliases
export const ContactType = CustomerType;
export const ContactSector = CustomerSector;

/**
 * Customer - The Single Source of Truth (SSOT) for all person/company data
 * This is the central entity that all modules reference.
 * Phone number is the unique identifier for deduplication.
 * customerId is the human-readable global identifier (e.g., CUS-1001).
 */
export interface ICustomer {
    customerId: string;        // Human-readable global ID (CUS-1001)
    phone:      string;        // UNIQUE - Primary deduplication key
    name:       string;        // Full name of person/company
    type:       CustomerType;  // Lead source/channel
    sector:     CustomerSector;// Business classification
    email?:     string;        // Optional email
    company?:   string;        // Optional company name
    address?:   string;        // Optional address
    region?:    string;        // Optional region
    notes?:     string;        // General notes
    csPerson?:  string;        // Email of the CS person who first modified this record
    createdAt:  Date;
    updatedAt:  Date;
}

export interface ICustomerDocument extends ICustomer, Document {
    _id: Types.ObjectId;
}

// Backward compatibility aliases
export type IContact = ICustomer;
export type IContactDocument = ICustomerDocument;

