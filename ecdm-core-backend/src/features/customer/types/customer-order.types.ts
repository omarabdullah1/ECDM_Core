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
