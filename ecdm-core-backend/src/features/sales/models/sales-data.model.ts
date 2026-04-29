import mongoose, { Schema, Model } from 'mongoose';
import { ISalesDataDocument, SalesDataCallOutcome, YesNo } from '../types/sales-data.types';

const salesDataSchema = new Schema<ISalesDataDocument>(
    {
        marketingData: { type: Schema.Types.ObjectId, ref: 'MarketingData' },
        salesPerson:   { type: Schema.Types.ObjectId, ref: 'User' },
        customer:      { type: Schema.Types.ObjectId, ref: 'Customer', required: [true, 'Customer reference is required'] },
        callDate:      { type: Date },
        callOutcome:   { type: String, enum: Object.values(SalesDataCallOutcome), default: SalesDataCallOutcome.Pending },
        typeOfOrder:   { type: String, enum: ['', 'Maintenance', 'General supplies', 'Supply and installation'], default: '' },
        salesPlatform: { type: String, enum: ['', 'Online', 'In Side', 'Phone', 'Out side', 'Data'], default: '' },
        issue:         { type: String, default: '' },
        order:         { type: String, enum: [...Object.values(YesNo), ''], default: '' },
        followUp:      { type: String, enum: [...Object.values(YesNo), ''], default: '' },
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

