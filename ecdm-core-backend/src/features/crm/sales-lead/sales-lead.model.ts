import mongoose, { Schema, Model } from 'mongoose';
import {
    ISalesLeadDocument,
    LeadPlatform,
    OrderType,
} from './sales-lead.types';

const salesLeadSchema = new Schema<ISalesLeadDocument>(
    {
        // Links to the Customer collection — who this lead belongs to
        customer: {
            type:     Schema.Types.ObjectId,
            ref:      'Customer',
            required: [true, 'Customer reference is required'],
        },

        // Links to the User collection — the Sales person managing this lead
        salesPerson: {
            type:     Schema.Types.ObjectId,
            ref:      'User',
            required: [true, 'Sales person is required'],
        },

        platform: {
            type:     String,
            enum:     Object.values(LeadPlatform),
            required: [true, 'Platform is required'],
        },
        typeOfOrder: {
            type:     String,
            enum:     Object.values(OrderType),
            required: [true, 'Type of order is required'],
        },
        followUpRequired: { type: Boolean, default: false },
        followUpDate:     { type: Date },
        notes:            { type: String, maxlength: [2000, 'Notes cannot exceed 2000 characters'] },
    },
    {
        timestamps: true,
        toJSON:     { virtuals: true },
        toObject:   { virtuals: true },
    },
);

salesLeadSchema.index({ customer:    1 });
salesLeadSchema.index({ salesPerson: 1 });
salesLeadSchema.index({ platform:    1 });
salesLeadSchema.index({ followUpRequired: 1, followUpDate: 1 }); // compound for follow-up queries

const SalesLead: Model<ISalesLeadDocument> =
    mongoose.model<ISalesLeadDocument>('SalesLead', salesLeadSchema);

export default SalesLead;
