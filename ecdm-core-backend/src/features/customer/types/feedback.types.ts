import { Document, Types } from 'mongoose';

export interface IFeedback {
    workOrder:             Types.ObjectId;   // → WorkOrder
    customer:              Types.ObjectId;   // → Customer (shared)
    engineer:              Types.ObjectId;   // → User (MaintenanceEngineer)
    ratingOperation:       number;           // 1–5: technical quality
    ratingCustomerService: number;           // 1–5: customer service quality
    notes?:                string;
    createdAt:             Date;
    updatedAt:             Date;
}

export interface IFeedbackDocument extends IFeedback, Document {
    _id: Types.ObjectId;
}
