import mongoose, { Schema, Model } from 'mongoose';
import {
    IWorkOrderDocument,
    Punctuality,
    TaskCompleted,
    SparePartsAvailability,
} from '../types/work-order.types';

/**
 * Work Order Schema - Maintenance/Workshop Module
 * 
 * Automatically generated when a CustomerOrder is created (cascaded from Sales Order).
 * References CustomerOrder to inherit customer, sales, and ops data.
 * Contains maintenance-specific fields for the workshop team.
 */
const workOrderSchema = new Schema<IWorkOrderDocument>(
    {
        // Required: Reference to CustomerOrder (inherits all upstream data via population)
        customerOrderId: {
            type:     Schema.Types.ObjectId,
            ref:      'CustomerOrder',
            required: [true, 'Customer Order reference is required'],
        },

        // Workshop / Maintenance Specific Fields
        taskDate:           { type: Date },   // Op role task date
        maintenanceEngineer: { type: String, default: '' },
        startMaintenanceDate: { type: Date },
        endMaintenanceDate:   { type: Date },
        punctuality: {
            type:    String,
            enum:    Object.values(Punctuality),
            default: Punctuality.Empty,
        },
        reasonForDelay:      { type: String, default: '' },
        taskCompleted: {
            type:    String,
            enum:    Object.values(TaskCompleted),
            default: TaskCompleted.Empty,
        },
        reasonForIncompletion: { type: String, default: '' },
        rating:              { type: String, default: '' },
        sparePartsId:        { type: String, default: '' },
        sparePartsAvailability: {
            type:    String,
            enum:    Object.values(SparePartsAvailability),
            default: SparePartsAvailability.Empty,
        },
        notes: { type: String, default: '', maxlength: [2000, 'Notes cannot exceed 2000 characters'] },

        // Tracking
        updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    {
        timestamps: true,
        toJSON:     { virtuals: true },
        toObject:   { virtuals: true },
    },
);

// Indexes for common queries
workOrderSchema.index({ customerOrderId: 1 });
workOrderSchema.index({ maintenanceEngineer: 1 });
workOrderSchema.index({ punctuality: 1 });
workOrderSchema.index({ taskCompleted: 1 });
workOrderSchema.index({ createdAt: -1 });

const WorkOrder: Model<IWorkOrderDocument> =
    mongoose.model<IWorkOrderDocument>('WorkOrder', workOrderSchema);

export default WorkOrder;
