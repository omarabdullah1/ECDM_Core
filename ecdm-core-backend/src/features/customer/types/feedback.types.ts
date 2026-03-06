import { Document, Types } from 'mongoose';

export interface IFeedback {
    customerId:            Types.ObjectId;   // → Customer (shared)
    customerOrderId?:      Types.ObjectId;   // → CustomerOrder (to inherit Engineer & Dates)
    
    // Feedback specific fields
    solvedIssue?:          'Yes' | 'No' | '';
    ratingOperation?:      string;           // e.g., '1 to 5', 'Excellent', etc.
    followUp?:             'Yes' | 'No' | ''; // Does this need another follow-up?
    ratingCustomerService?: string;
    notes?:                string;
    
    // Audit
    updatedBy?:   Types.ObjectId;  // → User (who last modified this record)
    createdAt:    Date;
    updatedAt:    Date;
}

export interface IFeedbackDocument extends IFeedback, Document {
    _id: Types.ObjectId;
}
