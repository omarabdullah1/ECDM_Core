import mongoose, { Schema, Model } from 'mongoose';
import {
    IWorkOrderDocument,
    Punctuality,
    TaskCompleted,
    SparePartsAvailability,
    IWorkOrderCost,
} from '../types/work-order.types';

/**
 * Work Order Schema - Maintenance/Workshop Module
 * 
 * Automatically generated when a CustomerOrder is created (cascaded from Sales Order).
 * References CustomerOrder to inherit customer, sales, and ops data.
 * Contains maintenance-specific fields for the workshop team.
 * Includes integration with Inventory for parts tracking.
 */

// ── Sub-schemas ──────────────────────────────────────────────────────────────

const workOrderPartSchema = new Schema(
    {
        inventoryId: { type: Schema.Types.ObjectId, ref: 'Inventory' },
        quantity: { type: Number, required: true, min: 1 },
        unitCost: { type: Number, required: true, min: 0 },
    },
    { _id: false },
);

const workOrderCostSchema = new Schema<IWorkOrderCost>(
    {
        partsTotal: { type: Number, default: 0, min: 0 },
        laborCost: { type: Number, default: 0, min: 0 },
        otherCosts: { type: Number, default: 0, min: 0 },
        grandTotal: { type: Number, default: 0, min: 0 },
    },
    { _id: false },
);

// ── Main schema ──────────────────────────────────────────────────────────────

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
        sparePartsAvailability: {
            type:    String,
            enum:    Object.values(SparePartsAvailability),
            default: SparePartsAvailability.Empty,
        },
        notes: { type: String, default: '', maxlength: [2000, 'Notes cannot exceed 2000 characters'] },

        // Parts usage tracking (integration with Inventory)
        partsUsed: { type: [workOrderPartSchema], default: [] },
        cost: { type: workOrderCostSchema, default: () => ({}) },
        actualCost: { type: Number, default: 0 },  // Calculated actual cost of parts used

        // Tracking
        invoiceId:     { type: String, default: '' },
        invoiceStatus: { type: String, default: 'Pending' },

        // Commission Tracking (Match Order Finance)
        engineerId:           { type: Schema.Types.ObjectId, ref: 'User' },
        commissionPercentage: { type: Number, default: 0 },

        updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    {
        timestamps: true,
        toJSON:     { virtuals: true },
        toObject:   { virtuals: true },
    },
);

// ── Pre-validate hook to sanitize and calculate costs ──────────────────────

workOrderSchema.pre<IWorkOrderDocument>('validate', function (next) {
    // ─── Sanitize partsUsed ───
    if (this.partsUsed && this.partsUsed.length > 0) {
        // Filter out items that don't have a valid inventoryId (fixes legacy/empty rows)
        this.partsUsed = (this.partsUsed as any[]).filter(p => {
            const id = p.inventoryId || (p as any).inventoryItemId || (p as any).InventoryItemId;
            if (id && mongoose.Types.ObjectId.isValid(String(id))) {
                // Ensure field name is standardized to inventoryId
                if (!p.inventoryId) p.inventoryId = id;
                return true;
            }
            return false;
        });
    }

    // Calculate parts total based on quantity * unitCost
    if (this.partsUsed && this.partsUsed.length > 0) {
        this.cost.partsTotal = this.partsUsed.reduce((sum, part) => sum + (part.quantity * part.unitCost), 0);
    } else {
        this.cost.partsTotal = 0;
    }
    
    // Calculate grand total
    this.cost.grandTotal = this.cost.partsTotal + this.cost.laborCost + this.cost.otherCosts;
    next();
});

// ── Indexes ──────────────────────────────────────────────────────────────

// Indexes for common queries
workOrderSchema.index({ customerOrderId: 1 });
workOrderSchema.index({ maintenanceEngineer: 1 });
workOrderSchema.index({ punctuality: 1 });
workOrderSchema.index({ taskCompleted: 1 });
workOrderSchema.index({ createdAt: -1 });

const WorkOrder: Model<IWorkOrderDocument> =
    mongoose.model<IWorkOrderDocument>('WorkOrder', workOrderSchema);

export default WorkOrder;


