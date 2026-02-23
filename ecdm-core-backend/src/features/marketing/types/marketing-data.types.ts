import { Document, Types } from 'mongoose';

// Status of a bulk-uploaded data record moving through the pipeline
export enum MarketingDataStatus {
    New        = 'New',
    Assigned   = 'Assigned',   // Handed to a sales rep
    Converted  = 'Converted',  // Became a Customer + SalesData record
    Invalid    = 'Invalid',    // Bad data / duplicate / unreachable
}

export interface IMarketingData {
    // Core prospect info from the uploaded data sheet
    name:         string;
    phone:        string;
    company?:     string;
    email?:       string;
    address?:     string;
    region?:      string;
    sector?:      string;       // B2B / B2C / B2G or free-form

    // Batch metadata — lets you trace back which upload this record came from
    uploadBatch:  string;       // e.g. "Sheet-Jan-2026" or a UUID
    dataSource?:  string;       // e.g. "Exhibition 2026", "Purchased List"

    status:       MarketingDataStatus;

    // If converted, links to the resulting Customer document
    customer?:    Types.ObjectId;

    notes?:       string;
    createdAt:    Date;
    updatedAt:    Date;
}

export interface IMarketingDataDocument extends IMarketingData, Document {
    _id: Types.ObjectId;
}
