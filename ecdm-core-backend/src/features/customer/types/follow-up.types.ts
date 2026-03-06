import { Document, Types } from 'mongoose';

// Follow-up source type
export type FollowUpSource = 'WorkOrder' | 'SalesLead' | 'SalesData' | 'Manual';

// Follow-up status enum
export enum FollowUpStatus {
    Pending = 'Pending',
    Contacted = 'Contacted',
    Scheduled = 'Scheduled',
    Completed = 'Completed',
    Canceled = 'Canceled',
}

export interface IFollowUp {
    // Source references (at least one should be set, or source = 'Manual')
    workOrder?:           Types.ObjectId;    // → WorkOrder
    leadId?:              Types.ObjectId;    // → SalesLead
    salesDataId?:         Types.ObjectId;    // → SalesData
    customerOrderId?:     Types.ObjectId;    // → CustomerOrder (New: for QC pipeline)
    
    customer:             Types.ObjectId;    // → Customer (shared SSOT)
    csr?:                 Types.ObjectId;    // → User (CustomerService role)
    
    status:               FollowUpStatus;    // Workflow status
    
    // Quality Control Fields
    punctuality?:         'Same Visit Time' | 'Late' | '';   // New QC field
    reasonForDelay?:      string;                            // New QC field
    solvedIssue?:         'Yes' | 'No' | '';                 // Changed from boolean to string enum
    reasonForNotSolving?: string;
    
    followUpDate:         Date;
    notes?:               string;
    
    // Tracking
    updatedBy?:           Types.ObjectId;    // → User (who last modified)
    createdAt:            Date;
    updatedAt:            Date;
}

export interface IFollowUpDocument extends IFollowUp, Document {
    _id: Types.ObjectId;
}
