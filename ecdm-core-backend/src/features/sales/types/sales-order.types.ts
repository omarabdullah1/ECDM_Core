import { Document, Types } from 'mongoose';

export enum QuotationStatus {
    Accepted    = 'Accepted',
    Rejected    = 'Rejected',
    Negotiation = 'Negotiation',
    Pending     = 'Pending',
    Expired     = 'Expired',
}

export enum SalesOrderFinalStatus {
    Won     = 'Won',
    Lost    = 'Lost',
    Pending = 'Pending',
}

export interface ISalesOrder {
    // Origin — one of these two will be set (not both)
    salesLead?: Types.ObjectId;     // → SalesLead  (from inbound leads path)
    salesData?: Types.ObjectId;     // → SalesData  (from cold-call data path)

    customer:   Types.ObjectId;     // → Customer (shared) — always required

    issueDescription:            string;
    siteInspectionDate?:         Date;
    technicalInspection:         boolean;
    technicalInspectionDetails?: string;
    quotationNumber?:            string;
    quotationStatus:             QuotationStatus;
    finalStatus:                 SalesOrderFinalStatus;
    notes?:                      string;
    createdAt:                   Date;
    updatedAt:                   Date;
}

export interface ISalesOrderDocument extends ISalesOrder, Document {
    _id: Types.ObjectId;
}
