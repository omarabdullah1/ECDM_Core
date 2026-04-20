import { Document, Types } from 'mongoose';

// Device Pickup Type Options
export enum DevicePickupType {
    CustomerDropOff = 'Customer Drop-off',
    CompanyPickup   = 'Company Pickup',
    OnSiteRepair    = 'On-site Repair',
    NotSet          = '',
}

// Deal Status Options
export enum DealStatus {
    Pending  = 'Pending',
    Approved = 'Approved',
    Rejected = 'Rejected',
    Done     = 'Done',
    NotSet   = '',
}

export enum PaymentMethod {
    Cash = 'Cash',
    BankTransfer = 'Bank Transfer',
    NotSet = '',
}

export enum ExtraExpenseType {
    Other = 'Other',
    Transport = 'Transport',
    Delivery = 'Delivery',
    NotSet = '',
}

export interface ICustomerOrder {
    // Core references
    customerId:    Types.ObjectId;    // → Customer (shared SSOT) — always required
    salesOrderId:  Types.ObjectId;    // → SalesOrder — the originating sales order
    
    // Inherited fields (copied at creation for historic snapshot)
    typeOfOrder?:       string;
    issue?:             string;
    scheduledVisitDate?: Date;  // Inherited from Sales Order's siteInspectionDate
    
    // Operational Fields (New)
    engineerName?:       string;  // Or ObjectId referencing User/Employee
    actualVisitDate?:    Date;
    devicePickupType?:   DevicePickupType;
    deal?:               DealStatus;
    cost?:               number;
    
    // Financial Tracking (New)
    paidAmount?:         number;
    paymentMethod?:      PaymentMethod;
    spareParts?:         string;
    extraExpenseType?:   ExtraExpenseType;
    extraExpenseAmount?: number;
    salesPercentage?:    number; // e.g. 5 (percent, 0-100)
    technicianPercentage?: number;
    engineerPercentage?: number;
    // Personnel references (linked to User documents)
    salesPersonId?:   Types.ObjectId;  // Sales employee responsible for this order
    technicianId?:    Types.ObjectId;  // Technician assigned to this order
    engineerId?:      Types.ObjectId;  // Engineer assigned to this order
    
    startDate?:          Date;
    endDate?:            Date;
    deviceReturnedDate?: Date;
    notes?:              string;
    
    // Tracking
    updatedBy?:   Types.ObjectId;  // The user who last modified this record
    createdAt:    Date;
    updatedAt:    Date;
}

export interface ICustomerOrderDocument extends ICustomerOrder, Document {
    _id: Types.ObjectId;
}
