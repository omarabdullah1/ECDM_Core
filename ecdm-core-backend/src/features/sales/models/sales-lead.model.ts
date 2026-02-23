import mongoose, { Schema, Model } from 'mongoose';
import { ISalesLeadDocument, LeadPlatform, OrderType } from '../types/sales-leads.types';

const salesLeadSchema = new Schema<ISalesLeadDocument>(
    {
        customer:     { type: Schema.Types.ObjectId, ref: 'Customer',      required: [true, 'Customer reference is required'] },
        salesPerson:  { type: Schema.Types.ObjectId, ref: 'User',          required: [true, 'Sales person is required'] },
        marketingLead:{ type: Schema.Types.ObjectId, ref: 'MarketingLead' },
        platform:     { type: String, enum: Object.values(LeadPlatform), required: [true, 'Platform is required'] },
        typeOfOrder:  { type: String, enum: Object.values(OrderType),    required: [true, 'Type of order is required'] },
        followUpRequired: { type: Boolean, default: false },
        followUpDate:     { type: Date },
        notes:            { type: String, maxlength: [2000, 'Notes cannot exceed 2000 characters'] },
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

salesLeadSchema.index({ customer:      1 });
salesLeadSchema.index({ salesPerson:   1 });
salesLeadSchema.index({ platform:      1 });
salesLeadSchema.index({ marketingLead: 1 });
salesLeadSchema.index({ followUpRequired: 1, followUpDate: 1 });

const SalesLead: Model<ISalesLeadDocument> = mongoose.model<ISalesLeadDocument>('SalesLead', salesLeadSchema);
export default SalesLead;
