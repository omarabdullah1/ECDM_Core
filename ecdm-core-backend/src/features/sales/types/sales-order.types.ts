import { Document, Types } from 'mongoose';

export enum QuotationStatus {
    Accepted = 'Accepted',
    Rejected = 'Rejected',
    Negotiation = 'Negotiation',
    Pending = 'Pending',
    Expired = 'Expired',
}

export enum SalesOrderFinalStatus {
    Won = 'Won',
    Lost = 'Lost',
    Pending = 'Pending',
}

export enum SecondFollowUpStatus {
    Scheduled = 'Scheduled',
    NotRequired = 'Not Required',
}

export enum ThirdFollowUpStatus {
    Accepted = 'Accepted',
    NotPotential = 'Not Potential',
}

/**
 * Order Status - represents the lifecycle stage of a Sales Order.
 * Used for conditional workflow logic (e.g., can only cancel if 'Pending').
 */
export enum OrderStatus {
    Pending = 'Pending',
    Quoted = 'Quoted',
    InProgress = 'In Progress',
    Completed = 'Completed',
    Canceled = 'Canceled',
}

/**
 * Quotation Item Interface
 */
export interface IQuotationItem {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

/**
 * Quotation Interface
 */
export interface IQuotation {
    items: IQuotationItem[];
    subTotal: number;
    discount: number;
    grandTotal: number;
    notes?: string;
    createdAt?: Date;
}

export interface ISalesOrder {
    // Human-readable unique ID (auto-generated: "SO-1001", "SO-1002", etc.)
    salesOrderId: string;

    // Origin — one of these two will be set (not both)
    salesLead?: Types.ObjectId;     // → SalesLead  (from inbound leads path)
    salesData?: Types.ObjectId;     // → SalesData  (from cold-call data path)

    customer: Types.ObjectId;     // → Customer (shared) — always required

    salesPerson?: Types.ObjectId; // → User (salesperson assigned for performance tracking)

    // Order lifecycle status
    orderStatus: OrderStatus;

    issueDescription: string;
    issue?: string;  // Editable issue field for order phase
    typeOfOrder?: string;
    salesPlatform?: string;
    siteInspectionDate?: Date;

    // Technical Inspection (Conditional)
    isTechnicalInspectionRequired: boolean;
    technicalInspectionDate?: Date;
    technicalInspectionDetails?: string;

    // Quotation File Upload
    quotationFileUrl?: string;
    quotationFileName?: string;

    // Dynamic Quotation Builder
    quotation?: IQuotation;

    // First Follow-Up
    followUpFirst?: Date;
    quotationStatusFirstFollowUp?: QuotationStatus;
    reasonOfQuotation?: string;

    // Second Follow-Up
    followUpSecond?: Date;
    statusSecondFollowUp?: SecondFollowUpStatus | '';

    // Third Follow-Up
    followUpThird?: Date;
    finalStatusThirdFollowUp?: ThirdFollowUpStatus | '';

    // Legacy fields (kept for backward compatibility)
    quotationStatus: QuotationStatus;
    finalStatus: SalesOrderFinalStatus;

    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ISalesOrderDocument extends ISalesOrder, Document {
    _id: Types.ObjectId;
}
