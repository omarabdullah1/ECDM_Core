import mongoose, { Schema, Model } from 'mongoose';
import { IMarketingLeadDocument, MarketingLeadSource, MarketingLeadStatus } from '../types/marketing-leads.types';

const marketingLeadSchema = new Schema<IMarketingLeadDocument>(
    {
        title:       { type: String, required: [true, 'Lead title is required'], trim: true, maxlength: 200 },
        contactName: { type: String, required: [true, 'Contact name is required'], trim: true },
        email:       { type: String, trim: true, lowercase: true },
        phone:       { type: String, trim: true },
        company:     { type: String, trim: true },
        source: {
            type:    String,
            enum:    Object.values(MarketingLeadSource),
            default: MarketingLeadSource.Other,
        },
        status: {
            type:    String,
            enum:    Object.values(MarketingLeadStatus),
            default: MarketingLeadStatus.New,
        },
        value:      { type: Number, min: 0 },
        campaign:   { type: Schema.Types.ObjectId, ref: 'Campaign' },
        assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
        notes:      { type: String, maxlength: 2000 },
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

marketingLeadSchema.index({ status:     1 });
marketingLeadSchema.index({ source:     1 });
marketingLeadSchema.index({ assignedTo: 1 });
marketingLeadSchema.index({ campaign:   1 });
marketingLeadSchema.index({ title: 'text', contactName: 'text', company: 'text' });

// Mongoose model name: 'MarketingLead' → MongoDB collection: 'marketingleads'
const MarketingLead: Model<IMarketingLeadDocument> =
    mongoose.model<IMarketingLeadDocument>('MarketingLead', marketingLeadSchema);
export default MarketingLead;
