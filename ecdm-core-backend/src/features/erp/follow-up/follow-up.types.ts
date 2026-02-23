import { Document, Types } from 'mongoose';

export interface IFollowUp {
    // Links to WorkOrder collection — the service job this follow-up is about
    workOrder: Types.ObjectId;

    // Links to Customer collection — the customer being followed up with
    customer: Types.ObjectId;

    // Links to User collection (CustomerService role) — the CSR who conducted the follow-up
    csr: Types.ObjectId;

    solvedIssue:         boolean; // Was the customer's issue resolved?
    reasonForNotSolving?:string;  // Required when solvedIssue is false
    followUpDate:        Date;    // When the follow-up was / is scheduled
    notes?:              string;
    createdAt:           Date;
    updatedAt:           Date;
}

export interface IFollowUpDocument extends IFollowUp, Document {
    _id: Types.ObjectId;
}
