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
    
    customer:             Types.ObjectId;    // → Customer (shared SSOT)
    csr?:                 Types.ObjectId;    // → User (CustomerService role)
    
    status:               FollowUpStatus;    // New: Workflow status
    solvedIssue:          boolean;           // Legacy: Keep for backward compatibility
    reasonForNotSolving?: string;
    followUpDate:         Date;
    notes?:               string;
    createdAt:            Date;
    updatedAt:            Date;
}

export interface IFollowUpDocument extends IFollowUp, Document {
    _id: Types.ObjectId;
}
