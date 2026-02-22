import mongoose, { Schema, Model } from 'mongoose';
import { ILeadDocument, LeadSource, LeadStatus } from './lead.types';

const leadSchema = new Schema<ILeadDocument>(
    {
        title: { type: String, required: [true, 'Lead title is required'], trim: true, maxlength: 200 },
        contactName: { type: String, required: [true, 'Contact name is required'], trim: true },
        email: { type: String, trim: true, lowercase: true },
        phone: { type: String, trim: true },
        company: { type: String, trim: true },
        source: { type: String, enum: Object.values(LeadSource), default: LeadSource.Other },
        status: { type: String, enum: Object.values(LeadStatus), default: LeadStatus.New },
        value: { type: Number, min: 0 },
        assignedTo: { type: Schema.Types.ObjectId, ref: 'Employee' },
        notes: { type: String, maxlength: 2000 },
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

leadSchema.index({ status: 1 });
leadSchema.index({ source: 1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ title: 'text', contactName: 'text', company: 'text' });

const Lead: Model<ILeadDocument> = mongoose.model<ILeadDocument>('Lead', leadSchema);
export default Lead;
