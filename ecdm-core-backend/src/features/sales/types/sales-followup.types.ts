import { Document, Types } from 'mongoose';

/**
 * Status of a Sales Follow-Up record.
 * Used for Data Protection Guard logic.
 */
export enum SalesFollowUpStatus {
    Pending   = 'Pending',    // Not yet processed - can be deleted
    Contacted = 'Contacted',  // Customer contacted - protected
    Scheduled = 'Scheduled',  // Follow-up scheduled - protected
    Completed = 'Completed',  // Follow-up completed - protected
    Canceled  = 'Canceled',   // Manually canceled - protected
}

export interface ISalesFollowUp {
    salesData:    Types.ObjectId;    // → SalesData (origin reference)
    customer:     Types.ObjectId;    // → Customer (SSOT)
    salesPerson?: Types.ObjectId;    // → User (assigned rep)
    
    status:       SalesFollowUpStatus;
    scheduledDate?: Date;            // When follow-up is scheduled
    completedDate?: Date;            // When follow-up was completed
    notes?:       string;
    
    createdAt:    Date;
    updatedAt:    Date;
}

export interface ISalesFollowUpDocument extends ISalesFollowUp, Document {
    _id: Types.ObjectId;
}

