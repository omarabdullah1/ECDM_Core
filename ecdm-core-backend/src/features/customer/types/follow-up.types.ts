import { Document, Types } from 'mongoose';

export interface IFollowUp {
    workOrder:            Types.ObjectId;    // → WorkOrder
    customer:             Types.ObjectId;    // → Customer (shared)
    csr:                  Types.ObjectId;    // → User (CustomerService role)
    solvedIssue:          boolean;
    reasonForNotSolving?: string;
    followUpDate:         Date;
    notes?:               string;
    createdAt:            Date;
    updatedAt:            Date;
}

export interface IFollowUpDocument extends IFollowUp, Document {
    _id: Types.ObjectId;
}
