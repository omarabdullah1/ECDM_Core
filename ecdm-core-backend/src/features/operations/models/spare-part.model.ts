import mongoose, { Schema, Model, Document } from 'mongoose';
import { getNextSequence } from '../../shared/models/counter.model';

/**
 * SparePart Model - Operations/Inventory Module
 * 
 * Schema for managing spare parts inventory with PDF data sheet uploads.
 * Uses auto-generated sequential IDs (SP-1001, SP-1002, etc.)
 */

// ─────────────────────────────────────────────────────────────────────────────
// TypeScript Interface
// ─────────────────────────────────────────────────────────────────────────────

export interface ISparePartDocument extends Document {
    sparePartsId: string;           // Custom ID like 'SP-001'
    itemName: string;
    specification: string;
    dataSheetUrl: string;           // URL/Path to the uploaded PDF
    dataSheetFileName: string;      // Original file name
    category: string;
    unitPrice: number;
    notes: string;
    updatedBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mongoose Schema
// ─────────────────────────────────────────────────────────────────────────────

const sparePartSchema = new Schema<ISparePartDocument>(
    {
        // Human-readable unique ID (e.g., "SP-1001", "SP-1002")
        // Auto-generated on creation via pre-save hook
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

        // PDF Data Sheet Upload (handled by multer middleware)
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
            default: '',
            trim: true,
            maxlength: [100, 'Category cannot exceed 100 characters'],
        },

        unitPrice: {
            type: Number,
            default: 0,
            min: [0, 'Unit price cannot be negative'],
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
// Pre-save Hook: Auto-generate sparePartsId (SP-1001, SP-1002, etc.)
// ─────────────────────────────────────────────────────────────────────────────

sparePartSchema.pre('save', async function (next) {
    if (!this.sparePartsId) {
        const seq = await getNextSequence('spare-part');
        this.sparePartsId = `SP-${seq}`;
    }
    next();
});

// ─────────────────────────────────────────────────────────────────────────────
// Text Index for Search
// ─────────────────────────────────────────────────────────────────────────────

sparePartSchema.index({ itemName: 'text', specification: 'text', category: 'text' });

// ─────────────────────────────────────────────────────────────────────────────
// Export Model
// ─────────────────────────────────────────────────────────────────────────────

const SparePart: Model<ISparePartDocument> = mongoose.model<ISparePartDocument>('SparePart', sparePartSchema);
export default SparePart;
