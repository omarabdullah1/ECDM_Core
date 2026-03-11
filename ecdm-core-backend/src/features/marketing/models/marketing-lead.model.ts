import mongoose, { Schema, Model } from 'mongoose';
import { IMarketingLeadDocument, MarketingLeadSource, MarketingLeadStatus } from '../types/marketing-leads.types';

/**
 * MarketingLead Schema - Marketing pipeline module
 * 
 * References Customer (SSOT) for demographic data.
 * Uses Customer.customerId as the global human-readable ID.
 * Stores only marketing-specific pipeline information.
 */
const marketingLeadSchema = new Schema<IMarketingLeadDocument>(
    {
        // Reference to Customer (Single Source of Truth)
        customerId: {
            type:     Schema.Types.ObjectId,
            ref:      'Customer',
            required: [true, 'Customer reference is required'],
            index:    true,
        },
        
        date:   { type: Date, default: Date.now },
        notes:  { type: String, maxlength: 2000 },
        
        // Marketing-specific fields
        source: {
            type: String,
            enum: Object.values(MarketingLeadSource),
        },
        status: {
            type:    String,
            enum:    Object.values(MarketingLeadStatus),
            default: MarketingLeadStatus.New,
        },
        value:      { type: Number, min: 0 },
        campaign:   { type: Schema.Types.ObjectId, ref: 'Campaign' },
        assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
        
        // Legacy fields for backward compatibility (deprecated)
        title:       { type: String, trim: true, maxlength: 200 },
        contactName: { type: String, trim: true },
        email:       { type: String, trim: true, lowercase: true },
        company:     { type: String, trim: true },
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

marketingLeadSchema.index({ status:     1 });
marketingLeadSchema.index({ source:     1 });
marketingLeadSchema.index({ assignedTo: 1 });
marketingLeadSchema.index({ campaign:   1 });

const MarketingLead: Model<IMarketingLeadDocument> =
    mongoose.model<IMarketingLeadDocument>('MarketingLead', marketingLeadSchema);
export default MarketingLead;
