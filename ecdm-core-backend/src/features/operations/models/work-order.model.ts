import mongoose, { Schema, Model } from 'mongoose';
import {
    IWorkOrderDocument,
    Punctuality,
    LateDurationType,
    DevicePickupType,
} from '../types/work-order.types';
import { OrderType } from '../types/work-order.types';

// ── Sub-document: one phase of a multi-stage work order ──────────────────────
const taskStageSchema = new Schema(
    {
        stageName: {
            type:     String,
            enum:     ['First', 'Second', 'Third'],
            required: true,
        },
        completed:   { type: Boolean, default: false },
        completedAt: { type: Date },
        reason:      { type: String, maxlength: [1000, 'Reason cannot exceed 1000 characters'] },
    },
    { _id: false },
);

// ── Sub-document: spare part consumed during this work order ─────────────────
const sparePartUsedSchema = new Schema(
    {
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
    { _id: true },
);

// ── Main WorkOrder schema ─────────────────────────────────────────────────────
const workOrderSchema = new Schema<IWorkOrderDocument>(
    {
        customer: {
            type:     Schema.Types.ObjectId,
            ref:      'Customer',
            required: [true, 'Customer reference is required'],
        },

        assignedEngineer: {
            type:     Schema.Types.ObjectId,
            ref:      'User',
            required: [true, 'Assigned engineer is required'],
        },

        salesOrder: {
            type: Schema.Types.ObjectId,
            ref:  'SalesOrder',
        },

        // New: link to CustomerOrder for full lifecycle tracking
        customerOrder: {
            type: Schema.Types.ObjectId,
            ref:  'CustomerOrder',
        },

        typeOfOrder: {
            type:     String,
            enum:     Object.values(OrderType),
            required: [true, 'Type of order is required'],
        },

        issue: {
            type:      String,
            required:  [true, 'Issue description is required'],
            trim:      true,
            maxlength: [2000, 'Issue description cannot exceed 2000 characters'],
        },

        visitSiteDate: { type: Date },

        startMaintenanceDate: { type: Date },
        endMaintenanceDate:   { type: Date },
        punctuality:          { type: String, enum: Object.values(Punctuality) },
        lateDuration:         { type: Number, min: [0, 'Late duration cannot be negative'] },
        lateDurationType:     { type: String, enum: Object.values(LateDurationType) },
        reasonForDelay:       { type: String, maxlength: [1000, 'Reason cannot exceed 1000 characters'] },

        taskCompletedStages: { type: [taskStageSchema], default: [] },

        devicePickupType:   { type: String, enum: Object.values(DevicePickupType) },
        deviceReturned:     { type: Boolean, default: false },
        deviceReturnedDate: { type: Date },

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
workOrderSchema.index({ customerOrder:    1 });
workOrderSchema.index({ punctuality:      1 });
workOrderSchema.index({ typeOfOrder:      1 });
workOrderSchema.index({ createdAt:        -1 });
workOrderSchema.index({ assignedEngineer: 1, punctuality: 1 });

const WorkOrder: Model<IWorkOrderDocument> =
    mongoose.model<IWorkOrderDocument>('WorkOrder', workOrderSchema);

export default WorkOrder;
