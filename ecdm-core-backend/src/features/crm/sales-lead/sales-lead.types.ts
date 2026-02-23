import { Document, Types } from 'mongoose';

// Channel through which this lead was generated
export enum LeadPlatform {
    Online   = 'Online',
    Phone    = 'Phone',
    InSide   = 'In-Side',   // Customer visited the office
    OutSide  = 'Out-Side',  // Sales rep visited the customer
}

/**
 * Type of work being requested.
 * Defined here and re-exported so WorkOrder can import it
 * without creating a circular dependency.
 */
export enum OrderType {
    Maintenance          = 'Maintenance',
    GeneralSupplies      = 'General supplies',
    SupplyAndInstall     = 'Supply and installation',
}

export interface ISalesLead {
    // Links to the Customer who initiated this lead
    customer:         Types.ObjectId;

    // Links to the User (Sales role) responsible for this lead
    salesPerson:      Types.ObjectId;

    platform:         LeadPlatform;
    typeOfOrder:      OrderType;
    followUpRequired: boolean;
    followUpDate?:    Date;
    notes?:           string;
    createdAt:        Date;
    updatedAt:        Date;
}

export interface ISalesLeadDocument extends ISalesLead, Document {
    _id: Types.ObjectId;
}
