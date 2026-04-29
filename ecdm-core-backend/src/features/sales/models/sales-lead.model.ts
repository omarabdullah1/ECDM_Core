import mongoose, { Schema, Model } from 'mongoose';
import { ISalesLeadDocument, SalesLeadStatus } from '../types/sales-leads.types';

/**
 * SalesLead Schema - Sales pipeline module
 * 
 * References Customer (SSOT) for demographic data.
 * Uses Customer.customerId as the global human-readable ID.
 * Stores only sales-specific pipeline information.
 */
const salesLeadSchema = new Schema<ISalesLeadDocument>(
    {
        // Reference to Customer (Single Source of Truth)
        customerId: {
            type:     Schema.Types.ObjectId,
            ref:      'Customer',
            required: [true, 'Customer reference is required'],
            index:    true,
        },
        
        // Sales-specific pipeline fields
        issue:       { type: String, default: '' },
        order:       { type: String, default: '' },
        reason:      { type: String, default: '' },
        salesPerson: { type: String, default: '' },
        status: {
            type:    String,
            enum:    Object.values(SalesLeadStatus),
            default: SalesLeadStatus.New,
        },
        typeOfOrder: {
            type:    String,
            enum:    ['', 'Maintenance', 'General supplies', 'Supply and installation'],
            default: '',
        },
        salesPlatform: {
            type:    String,
            enum:    ['', 'Online', 'In Side', 'Phone', 'Out side', 'Data'],
            default: '',
        },
        date:  { type: Date, default: Date.now },
        notes: { type: String, default: '', maxlength: 2000 },
        
        // Reference to the original marketing lead
        marketingLeadId: { type: Schema.Types.ObjectId, ref: 'MarketingLead' },
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

salesLeadSchema.index({ status:          1 });
salesLeadSchema.index({ salesPerson:     1 });
salesLeadSchema.index({ marketingLeadId: 1 });

const SalesLead: Model<ISalesLeadDocument> = mongoose.model<ISalesLeadDocument>('SalesLead', salesLeadSchema);
export default SalesLead;

