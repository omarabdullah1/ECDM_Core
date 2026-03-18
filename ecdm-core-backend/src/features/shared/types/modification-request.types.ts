import { Document, Types } from 'mongoose';

// ── Modification Request Status ───────────────────────────────────────
export enum ModificationRequestStatus {
    Pending = 'Pending',
    Approved = 'Approved',
    Rejected = 'Rejected',
}

// ── Supported Module Names for Maker-Checker ───────────────────────────
export enum ModuleName {
    SalesOrder = 'SalesOrder',
    CustomerOrder = 'CustomerOrder',
    WorkOrder = 'WorkOrder',
    SalesLead = 'SalesLead',
    SalesData = 'SalesData',
    MarketingLead = 'MarketingLead',
    SalesFollowUp = 'SalesFollowUp',
    CustomerFollowUp = 'CustomerFollowUp',
    Feedback = 'Feedback',
    InventoryPlus = 'InventoryPlus',
    PriceList = 'PriceList',
    Customer = 'Customer',
    Employee = 'Employee',
}

// ── Base interface (plain data shape) ───────────────────────────────
export interface IModificationRequest {
    moduleName: ModuleName;
    recordId: Types.ObjectId;
    requestedBy: Types.ObjectId;
    originalData: Record<string, unknown>;
    proposedData: Record<string, unknown>;
    status: ModificationRequestStatus;
    reviewedBy?: Types.ObjectId;
    reviewNotes?: string;
    createdAt: Date;
    updatedAt: Date;
}

// ── Mongoose document interface ─────────────────────────────────────
export interface IModificationRequestDocument extends IModificationRequest, Document {
    _id: Types.ObjectId;
}

// ── Review request input ────────────────────────────────────────────
export interface ReviewRequestInput {
    status: 'Approved' | 'Rejected';
    reviewNotes?: string;
}
