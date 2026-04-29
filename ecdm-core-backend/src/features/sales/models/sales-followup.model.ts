import mongoose, { Schema, Model } from 'mongoose';
import { ISalesFollowUpDocument, SalesFollowUpStatus } from '../types/sales-followup.types';

/**
 * SalesFollowUp Model
 * 
 * Tracks follow-up actions for SalesData records.
 * Created automatically when followUp = 'Yes' on a SalesData record.
 * Deleted automatically when followUp = 'No' (only if status is 'Pending').
 */
const salesFollowUpSchema = new Schema<ISalesFollowUpDocument>(
    {
        salesData: { 
            type: Schema.Types.ObjectId, 
            ref: 'SalesData', 
            required: [true, 'SalesData reference is required'],
            unique: true,  // One follow-up per SalesData record
            index: true,
        },
        customer: { 
            type: Schema.Types.ObjectId, 
            ref: 'Customer', 
            required: [true, 'Customer reference is required'],
            index: true,
        },
        salesPerson: { 
            type: Schema.Types.ObjectId, 
            ref: 'User',
            index: true,
        },
        status: { 
            type: String, 
            enum: Object.values(SalesFollowUpStatus), 
            default: SalesFollowUpStatus.Pending,
            index: true,
        },
        scheduledDate: { type: Date },
        completedDate: { type: Date },
        notes: { type: String, maxlength: [2000, 'Notes cannot exceed 2000 characters'] },
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

// Compound indexes for common queries
salesFollowUpSchema.index({ status: 1, scheduledDate: 1 });
salesFollowUpSchema.index({ salesPerson: 1, status: 1 });

const SalesFollowUp: Model<ISalesFollowUpDocument> = mongoose.model<ISalesFollowUpDocument>('SalesFollowUp', salesFollowUpSchema);
export default SalesFollowUp;

