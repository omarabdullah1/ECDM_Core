import { Document, Types } from 'mongoose';

export enum InvoiceStatus {
    Pending = 'Pending',
    PartiallyPaid = 'Partially Paid',
    Paid = 'Paid',
    Unpaid = 'Unpaid',
    Canceled = 'Canceled',
}

export interface IPayment {
    _id?: Types.ObjectId;
    amount: number;
    date: Date;
    method: string;
    notes?: string;
    recordedBy: Types.ObjectId;
}

export interface IInvoiceItem {
    description: string;
    quantity: number;
    unitPrice: number;
    inventoryItemId?: Types.ObjectId; // Link to inventory for stock deduction (Legacy)
    inventoryId?: Types.ObjectId;     // Link to Inventory for stock deduction
}

export interface IInvoice {
    invoiceNumber: string;
    customerId: Types.ObjectId;
    salesOrderId?: Types.ObjectId;
    items: IInvoiceItem[];
    subTotal: number;
    tax: number;
    grandTotal: number;
    paidAmount: number;
    payments: IPayment[];
    isStockDeducted: boolean;
    status: InvoiceStatus;
    approvedBy?: Types.ObjectId;
    approvalDate?: Date;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface IInvoiceDocument extends IInvoice, Document {
    _id: Types.ObjectId;
}


