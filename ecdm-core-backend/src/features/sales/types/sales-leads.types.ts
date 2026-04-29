import { Document, Types } from 'mongoose';

// Lead status through the sales pipeline
export enum SalesLeadStatus {
    New         = 'New',
    Contacted   = 'Contacted',
    Negotiation = 'Negotiation',
    Closed      = 'Closed',
}

/**
 * SalesLead - Module-specific data for sales pipeline
 * References Customer for demographic data (SSOT)
 * Uses Customer.customerId as the global human-readable ID
 */
export type TypeOfOrder = 'Maintenance' | 'General supplies' | 'Supply and installation';
export type SalesPlatform = 'Online' | 'In Side' | 'Phone' | 'Out side' | 'Data';

export interface ISalesLead {
    customerId:  Types.ObjectId;   // Reference to Customer (SSOT)
    // Sales-specific pipeline fields
    issue:         string;           // Issue description (filled by sales rep)
    order:         string;           // Order details (filled by sales rep)
    reason:        string;           // Reason/notes (filled by sales rep)
    salesPerson:   string;           // Email or name of the sales rep who updated
    status:        SalesLeadStatus;
    typeOfOrder:   TypeOfOrder | '';  // Type of order: Maintenance, General supplies, or Supply and installation
    salesPlatform: SalesPlatform | ''; // Sales platform: Online, In Side, Phone, Out side, or Data
    date:          Date;             // Lead date
    notes:         string;
    // Reference to the original marketing lead
    marketingLeadId?: Types.ObjectId;
    createdAt:   Date;
    updatedAt:   Date;
}

export interface ISalesLeadDocument extends ISalesLead, Document {
    _id: Types.ObjectId;
}

