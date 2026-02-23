import { Document, Types } from 'mongoose';

// Re-export so WorkOrder and other consumers share one definition
export { OrderType } from '../../crm/sales-lead/sales-lead.types';

// Whether the work was completed on time or late
export enum Punctuality {
    OnTime = 'On-Time',
    Late   = 'Late',
}

// Unit of measure for lateness duration
export enum LateDurationType {
    Hours = 'Hours',
    Days  = 'Days',
}

// How the customer's device was collected for service
export enum DevicePickupType {
    Workshop = 'Workshop', // Customer brought device to the workshop
    OnSite   = 'On-Site',  // Engineer went to the customer's location
}

// Stage name within a phased work order
export type TaskStageName = 'First' | 'Second' | 'Third';

/**
 * Represents one execution stage in a multi-phase work order.
 * e.g. diagnosis → repair → quality check.
 */
export interface ITaskStage {
    stageName:  TaskStageName;
    completed:  boolean;
    completedAt?: Date;
    reason?:    string; // Reason if stage was not completed / delayed
}

/**
 * A spare part consumed during this work order.
 * Links to InventoryItem collection so stock levels can be updated.
 */
export interface ISparePartUsed {
    // Links to InventoryItem collection — tracks which part was consumed
    inventoryItem: Types.ObjectId;
    quantity:      number;
    notes?:        string;
}

export interface IWorkOrder {
    // Links to the Customer collection — who the job is for
    customer:             Types.ObjectId;

    // Links to the User collection (MaintenanceEngineer role) — who is doing the job
    assignedEngineer:     Types.ObjectId;

    // Links to SalesOrder collection — the originating quotation (optional for walk-in jobs)
    salesOrder?:          Types.ObjectId;

    typeOfOrder:          string; // Values from OrderType enum (imported at model level)
    issue:                string; // Description of the problem/service requested
    visitSiteDate?:       Date;

    // --- Execution & Punctuality ---
    startMaintenanceDate?: Date;
    endMaintenanceDate?:   Date;
    punctuality?:          Punctuality;
    lateDuration?:         number;          // Numeric value (e.g. 3)
    lateDurationType?:     LateDurationType; // Unit: Hours or Days
    reasonForDelay?:       string;

    // --- Task Stage Tracking ---
    taskCompletedStages:   ITaskStage[];

    // --- Device Handling ---
    devicePickupType?:     DevicePickupType;
    deviceReturned:        boolean;
    deviceReturnedDate?:   Date;

    // --- Inventory Linkage ---
    // Array of spare parts consumed; each refs InventoryItem for stock reconciliation
    sparePartsUsed:        ISparePartUsed[];

    notes?:                string;
    createdAt:             Date;
    updatedAt:             Date;
}

export interface IWorkOrderDocument extends IWorkOrder, Document {
    _id: Types.ObjectId;
}
