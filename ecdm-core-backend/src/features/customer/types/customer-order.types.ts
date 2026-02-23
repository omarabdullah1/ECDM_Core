import { Document, Types } from 'mongoose';

// The confirmed service/product request that follows a Won SalesOrder
export enum CustomerOrderStatus {
    Pending    = 'Pending',     // Awaiting scheduling
    Scheduled  = 'Scheduled',   // Site visit / work date set
    InProgress = 'In Progress', // Work order(s) have been created
    Completed  = 'Completed',   // All work orders done
    Cancelled  = 'Cancelled',
}

export interface ICustomerOrder {
    // Core references
    customer:      Types.ObjectId;    // → Customer (shared) — always required
    salesOrder:    Types.ObjectId;    // → SalesOrder — the Won quotation
    // Work orders spawned from this customer order (can be multiple)
    workOrders?:   Types.ObjectId[];  // → WorkOrder[]

    // Confirmed service definition
    serviceDescription: string;
    scheduledDate?:     Date;
    completedDate?:     Date;
    status:             CustomerOrderStatus;

    notes?:    string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ICustomerOrderDocument extends ICustomerOrder, Document {
    _id: Types.ObjectId;
}
