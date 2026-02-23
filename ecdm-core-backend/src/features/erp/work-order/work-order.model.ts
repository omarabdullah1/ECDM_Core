import mongoose, { Schema, Model } from 'mongoose';
import {
    IWorkOrderDocument,
    Punctuality,
    LateDurationType,
    DevicePickupType,
} from './work-order.types';
import { OrderType } from '../../crm/sales-lead/sales-lead.types';

// ── Sub-document: one phase of a multi-stage work order ──────────────────────
const taskStageSchema = new Schema(
    {
        stageName:   {
            type:     String,
            enum:     ['First', 'Second', 'Third'],
            required: true,
        },
        completed:   { type: Boolean, default: false },
        completedAt: { type: Date },
        reason:      { type: String, maxlength: [1000, 'Reason cannot exceed 1000 characters'] },
    },
    { _id: false }, // stages are value objects, not independently addressable
);

// ── Sub-document: spare part consumed during this work order ─────────────────
const sparePartUsedSchema = new Schema(
    {
        // Links to InventoryItem collection — enables stock reconciliation
        inventoryItem: {
            type:     Schema.Types.ObjectId,
            ref:      'InventoryItem',
            required: true,
        },
        quantity: {
            type:     Number,
            required: true,
            min:      [0.01, 'Quantity must be greater than zero'],
        },
        notes: { type: String, maxlength: [500, 'Notes cannot exceed 500 characters'] },
    },
    { _id: true }, // each usage entry has its own ID for individual reference
);

// ── Main WorkOrder schema ─────────────────────────────────────────────────────
const workOrderSchema = new Schema<IWorkOrderDocument>(
    {
        // Links to Customer collection — the client requesting the service
        customer: {
            type:     Schema.Types.ObjectId,
            ref:      'Customer',
            required: [true, 'Customer reference is required'],
        },

        // Links to User collection (MaintenanceEngineer role) — the assigned technician
        assignedEngineer: {
            type:     Schema.Types.ObjectId,
            ref:      'User',
            required: [true, 'Assigned engineer is required'],
        },

        // Links to SalesOrder collection — the originating quotation (optional for walk-in jobs)
        salesOrder: {
            type: Schema.Types.ObjectId,
            ref:  'SalesOrder',
        },

        typeOfOrder: {
            type:     String,
            enum:     Object.values(OrderType),
            required: [true, 'Type of order is required'],
        },

        issue: {
            type:     String,
            required: [true, 'Issue description is required'],
            trim:     true,
            maxlength:[2000, 'Issue description cannot exceed 2000 characters'],
        },

        visitSiteDate: { type: Date },

        // ── Execution & Punctuality ───────────────────────────────────────────
        startMaintenanceDate: { type: Date },
        endMaintenanceDate:   { type: Date },
        punctuality:          { type: String, enum: Object.values(Punctuality) },
        lateDuration:         { type: Number, min: [0, 'Late duration cannot be negative'] },
        lateDurationType:     { type: String, enum: Object.values(LateDurationType) },
        reasonForDelay:       { type: String, maxlength: [1000, 'Reason cannot exceed 1000 characters'] },

        // ── Task Stage Tracking ───────────────────────────────────────────────
        taskCompletedStages: { type: [taskStageSchema], default: [] },

        // ── Device Handling ───────────────────────────────────────────────────
        devicePickupType:  { type: String, enum: Object.values(DevicePickupType) },
        deviceReturned:    { type: Boolean, default: false },
        deviceReturnedDate:{ type: Date },

        // ── Inventory Linkage ─────────────────────────────────────────────────
        // Each entry refs InventoryItem; a service layer should deduct stock on save
        sparePartsUsed: { type: [sparePartUsedSchema], default: [] },

        notes: { type: String, maxlength: [2000, 'Notes cannot exceed 2000 characters'] },
    },
    {
        timestamps: true,
        toJSON:     { virtuals: true },
        toObject:   { virtuals: true },
    },
);

workOrderSchema.index({ customer:         1 });
workOrderSchema.index({ assignedEngineer: 1 });
workOrderSchema.index({ salesOrder:       1 });
workOrderSchema.index({ punctuality:      1 });
workOrderSchema.index({ typeOfOrder:      1 });
workOrderSchema.index({ createdAt:        -1 });
// Compound: find all late orders for a specific engineer
workOrderSchema.index({ assignedEngineer: 1, punctuality: 1 });

const WorkOrder: Model<IWorkOrderDocument> =
    mongoose.model<IWorkOrderDocument>('WorkOrder', workOrderSchema);

export default WorkOrder;
