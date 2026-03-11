import mongoose, { Schema, Model } from 'mongoose';
import { ISalesTargetDocument } from '../types/sales-target.types';

/**
 * Sales Target Schema - Monthly financial targets for salespeople
 * 
 * Admins set monthly targets, and the system calculates achievement 
 * based on quotation values from won/scheduled/potential Sales Orders.
 */
const salesTargetSchema = new Schema<ISalesTargetDocument>(
    {
        salespersonId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Salesperson ID is required'],
            index: true,
        },
        month: {
            type: Number,
            required: [true, 'Month is required'],
            min: [1, 'Month must be between 1 and 12'],
            max: [12, 'Month must be between 1 and 12'],
        },
        year: {
            type: Number,
            required: [true, 'Year is required'],
            min: [2020, 'Year must be 2020 or later'],
        },
        targetAmount: {
            type: Number,
            required: [true, 'Target amount is required'],
            default: 0,
            min: [0, 'Target amount cannot be negative'],
        },
    },
    { 
        timestamps: true, 
        toJSON: { virtuals: true }, 
        toObject: { virtuals: true } 
    }
);

// Compound index to ensure one target per salesperson per month/year
salesTargetSchema.index({ salespersonId: 1, month: 1, year: 1 }, { unique: true });

const SalesTarget: Model<ISalesTargetDocument> = 
    mongoose.model<ISalesTargetDocument>('SalesTarget', salesTargetSchema);

export default SalesTarget;
