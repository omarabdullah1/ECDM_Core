import { Document, Types } from 'mongoose';

// Status of the quotation presented to the customer
export enum QuotationStatus {
    Accepted    = 'Accepted',
    Rejected    = 'Rejected',
    Negotiation = 'Negotiation',
    Pending     = 'Pending',
    Expired     = 'Expired',
}

// Final commercial outcome once a quotation is resolved
export enum SalesOrderFinalStatus {
    Won     = 'Won',
    Lost    = 'Lost',
    Pending = 'Pending',
}

export interface ISalesOrder {
    // Links to the SalesLead collection that originated this order (when applicable)
    salesLead?: Types.ObjectId;

    // Links to the Customer collection
    customer:   Types.ObjectId;

    issueDescription:         string;
    siteInspectionDate?:      Date;
    technicalInspection:      boolean;         // Was a technical inspection conducted?
    technicalInspectionDetails?: string;       // Details / findings of the inspection

    // Quotation number or URL/path to the PDF document
    quotationNumber?:         string;
    quotationStatus:          QuotationStatus;

    // Commercial outcome after negotiation
    finalStatus:              SalesOrderFinalStatus;

    notes?:                   string;
    createdAt:                Date;
    updatedAt:                Date;
}

export interface ISalesOrderDocument extends ISalesOrder, Document {
    _id: Types.ObjectId;
}
