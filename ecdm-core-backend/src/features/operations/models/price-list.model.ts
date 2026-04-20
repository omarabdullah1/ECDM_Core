import mongoose, { Document, Model, Schema } from 'mongoose';
import { getNextSequence } from '../../shared/models/counter.model';

/**
 * PriceList Model — Operations Module
 *
 * Manages the company price list for spare parts, general supplies,
 * and supply-and-installation services.
 * Uses auto-generated sequential IDs (PL-1001, PL-1002, …)
 */

// ─────────────────────────────────────────────────────────────────────────────
// TypeScript Interface
// ─────────────────────────────────────────────────────────────────────────────

export interface IPriceListDocument extends Document {
    sparePartsId: string;
    itemName: string;
    specification: string;
    dataSheetUrl: string;
    dataSheetFileName: string;
    category: 'Maintenance' | 'General supply' | 'Supply and installation';
    unitPrice: number;
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

const priceListSchema = new Schema<IPriceListDocument>(
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

priceListSchema.pre('save', async function (next) {
    if (!this.sparePartsId) {
        const seq = await getNextSequence('price-list');
        this.sparePartsId = `PL-${seq}`;
    }
    next();
});

// ─────────────────────────────────────────────────────────────────────────────
// Text Index for Search
// ─────────────────────────────────────────────────────────────────────────────

priceListSchema.index({ itemName: 'text', specification: 'text', category: 'text' });

// ─────────────────────────────────────────────────────────────────────────────
// Export Model
// ─────────────────────────────────────────────────────────────────────────────

const PriceList: Model<IPriceListDocument> = mongoose.model<IPriceListDocument>(
    'PriceList',
    priceListSchema
);
export default PriceList;
