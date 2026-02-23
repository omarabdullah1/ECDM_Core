import { Document, Types } from 'mongoose';

// Status of a cold-call attempt on a MarketingData record
export enum SalesDataCallOutcome {
    Pending    = 'Pending',     // Not called yet
    NoAnswer   = 'No Answer',
    Interested = 'Interested',  // Customer wants follow-up
    Converted  = 'Converted',   // Generated a SalesOrder
    Rejected   = 'Rejected',
}

export interface ISalesData {
    // The MarketingData record being worked on
    marketingData:   Types.ObjectId;    // → MarketingData
    // Sales rep making the call
    salesPerson:     Types.ObjectId;    // → User
    // If the call succeeds and a Customer is created, link it here
    customer?:       Types.ObjectId;    // → Customer (shared)

    callDate?:       Date;
    callOutcome:     SalesDataCallOutcome;
    followUpDate?:   Date;
    notes?:          string;
    createdAt:       Date;
    updatedAt:       Date;
}

export interface ISalesDataDocument extends ISalesData, Document {
    _id: Types.ObjectId;
}
