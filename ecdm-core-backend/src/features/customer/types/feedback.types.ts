import { Document, Types } from 'mongoose';

// Order Context - Single Source of Truth for inheriting from CustomerOrder
export interface IOrderContext {
    customerName?: string;
    customerPhone?: string;
    customerId?: string;
    engineerName?: string;
    visitDate?: Date;
    scheduledVisitDate?: Date;
    actualVisitDate?: Date;
    startDate?: Date;
    endDate?: Date;
    dealStatus?: string;
    orderId?: string;
}

export interface IFeedback {
    customerId:            Types.ObjectId;   // → Customer (shared)
    customerOrderId:        Types.ObjectId;   // → CustomerOrder (Required: must trace back to an actual Order/Service)
    
    // Order Context - Single Source of Truth (inherited from CustomerOrder)
    orderContext?:         IOrderContext;
    
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
