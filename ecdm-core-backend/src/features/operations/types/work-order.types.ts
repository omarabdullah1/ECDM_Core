import { Document, Types } from 'mongoose';

// Type of maintenance/supply work carried out on a work order
export enum OrderType {
    Maintenance      = 'Maintenance',
    GeneralSupplies  = 'General supplies',
    SupplyAndInstall = 'Supply and installation',
}

export enum Punctuality {
    OnTime = 'On-Time',
    Late   = 'Late',
}

export enum LateDurationType {
    Hours = 'Hours',
    Days  = 'Days',
}

export enum DevicePickupType {
    Workshop = 'Workshop',
    OnSite   = 'On-Site',
}

export type TaskStageName = 'First' | 'Second' | 'Third';

export interface ITaskStage {
    stageName:    TaskStageName;
    completed:    boolean;
    completedAt?: Date;
    reason?:      string;
}

export interface ISparePartUsed {
    inventoryItem: Types.ObjectId;   // → InventoryItem
    quantity:      number;
    notes?:        string;
}

export interface IWorkOrder {
    customer:              Types.ObjectId;   // → Customer (shared)
    assignedEngineer:      Types.ObjectId;   // → User
    // The customer order that spawned this work order
    customerOrder?:        Types.ObjectId;   // → CustomerOrder
    // Kept for backwards compat / direct creation without a CustomerOrder
    salesOrder?:           Types.ObjectId;   // → SalesOrder
    typeOfOrder:           string;
    issue:                 string;
    visitSiteDate?:        Date;
    startMaintenanceDate?: Date;
    endMaintenanceDate?:   Date;
    punctuality?:          Punctuality;
    lateDuration?:         number;
    lateDurationType?:     LateDurationType;
    reasonForDelay?:       string;
    taskCompletedStages:   ITaskStage[];
    devicePickupType?:     DevicePickupType;
    deviceReturned:        boolean;
    deviceReturnedDate?:   Date;
    sparePartsUsed:        ISparePartUsed[];
    notes?:                string;
    createdAt:             Date;
    updatedAt:             Date;
}

export interface IWorkOrderDocument extends IWorkOrder, Document {
    _id: Types.ObjectId;
}
