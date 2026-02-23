import { Document, Types } from 'mongoose';

// Channel through which the inbound lead arrived at the sales team
export enum LeadPlatform {
    Online  = 'Online',
    Phone   = 'Phone',
    InSide  = 'In-Side',   // Customer visited the office
    OutSide = 'Out-Side',  // Sales rep visited the customer
}

// Type of work being requested
export enum OrderType {
    Maintenance      = 'Maintenance',
    GeneralSupplies  = 'General supplies',
    SupplyAndInstall = 'Supply and installation',
}

export interface ISalesLead {
    customer:          Types.ObjectId;    // → Customer (shared)
    salesPerson:       Types.ObjectId;    // → User
    // Optional back-reference to which marketing lead was converted
    marketingLead?:    Types.ObjectId;    // → MarketingLead
    platform:          LeadPlatform;
    typeOfOrder:       OrderType;
    followUpRequired:  boolean;
    followUpDate?:     Date;
    notes?:            string;
    createdAt:         Date;
    updatedAt:         Date;
}

export interface ISalesLeadDocument extends ISalesLead, Document {
    _id: Types.ObjectId;
}
