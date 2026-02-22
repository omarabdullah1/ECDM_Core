import { Document, Types } from 'mongoose';

export enum InvoiceStatus {
    Draft = 'Draft',
    Sent = 'Sent',
    Paid = 'Paid',
    Overdue = 'Overdue',
    Cancelled = 'Cancelled',
}

export interface IInvoiceItem {
    description: string;
    quantity: number;
    unitPrice: number;
}

export interface IInvoice {
    invoiceNumber: string;
    client?: Types.ObjectId;
    items: IInvoiceItem[];
    subtotal: number;
    tax: number;
    total: number;
    status: InvoiceStatus;
    issueDate: Date;
    dueDate?: Date;
    paidAt?: Date;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface IInvoiceDocument extends IInvoice, Document {
    _id: Types.ObjectId;
}
