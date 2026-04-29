import mongoose, { Document, Model, Schema } from 'mongoose';
import { getNextSequence } from '../../shared/models/counter.model';

/**
 * Inventory Model — Operations Module
 *
 * Manages the company Inventory for spare parts, general supplies,
 * and supply-and-installation services.
 * Uses auto-generated sequential IDs (PL-1001, PL-1002, …)
 */

// ─────────────────────────────────────────────────────────────────────────────
// TypeScript Interface
// ─────────────────────────────────────────────────────────────────────────────

export interface IInventoryDocument extends Document {
    sparePartsId: string;
    itemName: string;
    specification: string;
    dataSheetUrl: string;
    dataSheetFileName: string;
    category: 'Maintenance' | 'General supply' | 'Supply and installation';
    unitPrice: number;
    pendingUnitPrice: number;
    priceStatus: 'Pending' | 'Confirmed';
    priceConfirmedBy?: mongoose.Types.ObjectId;
    priceConfirmedAt?: Date;
    cost: number;
    availableQuantity: number;
    minStockLevel: number;
    notes: string;
    updatedBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mongoose Schema
// ─────────────────────────────────────────────────────────────────────────────

const InventorySchema = new Schema<IInventoryDocument>(
    {
        sparePartsId: {
            type: String,
            unique: true,
            index: true,
        },

        itemName: {
            type: String,
            required: [true, 'Item name is required'],
            trim: true,
            maxlength: [200, 'Item name cannot exceed 200 characters'],
        },

        specification: {
            type: String,
            default: '',
            trim: true,
            maxlength: [2000, 'Specification cannot exceed 2000 characters'],
        },

        dataSheetUrl: {
            type: String,
            default: '',
            trim: true,
        },

        dataSheetFileName: {
            type: String,
            default: '',
            trim: true,
        },

        category: {
            type: String,
            enum: {
                values: ['Maintenance', 'General supply', 'Supply and installation'],
                message: 'Category must be Maintenance, General supply, or Supply and installation',
            },
            default: '',
        },

        unitPrice: {
            type: Number,
            default: 0,
            min: [0, 'Unit price cannot be negative'],
        },

        pendingUnitPrice: {
            type: Number,
            default: 0,
            min: [0, 'Pending unit price cannot be negative'],
        },

        priceStatus: {
            type: String,
            enum: ['Pending', 'Confirmed'],
            default: 'Confirmed',
        },

        priceConfirmedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },

        priceConfirmedAt: {
            type: Date,
        },
        
        cost: {
            type: Number,
            default: 0,
            min: [0, 'Cost cannot be negative'],
        },
        
        availableQuantity: {
            type: Number,
            default: 0,
            min: [0, 'Quantity cannot be negative'],
        },

        minStockLevel: {
            type: Number,
            default: 5,
            min: [0, 'Minimum stock level cannot be negative'],
        },

        notes: {
            type: String,
            default: '',
            maxlength: [2000, 'Notes cannot exceed 2000 characters'],
        },

        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ─────────────────────────────────────────────────────────────────────────────
// Pre-save Hook: Auto-generate sparePartsId (PL-1001, PL-1002, …)
// ─────────────────────────────────────────────────────────────────────────────

InventorySchema.pre<IInventoryDocument>('save', async function (next) {
    if (!this.sparePartsId) {
        const seq = await getNextSequence('inventory');
        this.sparePartsId = `PL-${seq}`;
    }
    next();
});

// ─────────────────────────────────────────────────────────────────────────────
// Text Index for Search
// ─────────────────────────────────────────────────────────────────────────────

InventorySchema.index({ itemName: 'text', specification: 'text', category: 'text' });

// ─────────────────────────────────────────────────────────────────────────────
// Export Model
// ─────────────────────────────────────────────────────────────────────────────

const Inventory: Model<IInventoryDocument> = mongoose.model<IInventoryDocument>(
    'Inventory',
    InventorySchema
);
export default Inventory;

