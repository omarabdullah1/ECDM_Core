import mongoose, { Schema, Model } from 'mongoose';
import { ISalesDataDocument, SalesDataCallOutcome } from '../types/sales-data.types';

const salesDataSchema = new Schema<ISalesDataDocument>(
    {
        marketingData: { type: Schema.Types.ObjectId, ref: 'MarketingData', required: [true, 'Marketing data record is required'] },
        salesPerson:   { type: Schema.Types.ObjectId, ref: 'User',          required: [true, 'Sales person is required'] },
        customer:      { type: Schema.Types.ObjectId, ref: 'Customer' },
        callDate:      { type: Date },
        callOutcome:   { type: String, enum: Object.values(SalesDataCallOutcome), default: SalesDataCallOutcome.Pending },
        followUpDate:  { type: Date },
        notes:         { type: String, maxlength: [2000, 'Notes cannot exceed 2000 characters'] },
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

salesDataSchema.index({ marketingData: 1 });
salesDataSchema.index({ salesPerson:   1 });
salesDataSchema.index({ customer:      1 });
salesDataSchema.index({ callOutcome:   1 });
salesDataSchema.index({ followUpDate:  1 });

const SalesData: Model<ISalesDataDocument> = mongoose.model<ISalesDataDocument>('SalesData', salesDataSchema);
export default SalesData;
