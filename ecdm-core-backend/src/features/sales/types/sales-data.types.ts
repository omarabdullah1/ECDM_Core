import { Document, Types } from 'mongoose';

// Status of a cold-call attempt on a MarketingData record
export enum SalesDataCallOutcome {
    Pending    = 'Pending',     // Not called yet
    NoAnswer   = 'No Answer',
    Interested = 'Interested',  // Customer wants follow-up
    Converted  = 'Converted',   // Generated a SalesOrder
    Rejected   = 'Rejected',
}

// Yes/No enum for Order and Follow-Up fields
export enum YesNo {
    Yes = 'Yes',
    No  = 'No',
}

export type TypeOfOrder = 'Maintenance' | 'General supplies' | 'Supply and installation';
export type SalesPlatform = 'Online' | 'In Side' | 'Phone' | 'Out side' | 'Data';

export interface ISalesData {
    // The MarketingData record being worked on (optional for Excel imports)
    marketingData?:  Types.ObjectId;    // → MarketingData
    // Sales rep making the call (optional for Excel imports)
    salesPerson?:    Types.ObjectId;    // → User
    // Customer reference (required - SSOT)
    customer:        Types.ObjectId;    // → Customer (shared)

    callDate?:       Date;
    callOutcome:     SalesDataCallOutcome;
    typeOfOrder?:    TypeOfOrder | '';    // Restricted to specific values
    salesPlatform?:  SalesPlatform | '';  // Restricted to specific values
    issue?:          string;              // Issue/Problem description
    order?:          YesNo | '';          // Restricted to Yes/No
    followUp?:       YesNo | '';          // Restricted to Yes/No
    followUpDate?:   Date;
    notes?:          string;
    createdAt:       Date;
    updatedAt:       Date;
}

export interface ISalesDataDocument extends ISalesData, Document {
    _id: Types.ObjectId;
}
