import mongoose, { Schema, Model } from 'mongoose';
import { ICampaignDocument, CampaignStatus, NextSteps } from './campaign.types';

export { CampaignStatus, NextSteps } from './campaign.types';

const campaignSchema = new Schema<ICampaignDocument>(
    {
        campaignId:          { type: String, unique: true, sparse: true },
        campaignName:        { type: String, required: [true, 'Campaign name is required'], trim: true, maxlength: [200, 'Campaign name cannot exceed 200 characters'] },
        status:              { type: String, enum: [...Object.values(CampaignStatus), ''], default: '' },
        impressions:         { type: Number, min: [0, 'Impressions cannot be negative'], default: 0 },
        conversions:         { type: Number, min: [0, 'Conversions cannot be negative'], default: 0 },
        salesRevenuePercent: { type: Number, min: [0, 'Sales revenue percent cannot be negative'], default: 0 },
        region1:             { type: String, default: '' },
        region2:             { type: String, default: '' },
        region3:             { type: String, default: '' },
        nextSteps:           { type: String, enum: [...Object.values(NextSteps), ''], default: '' },
        fileUrl:             { type: String, default: '' },
        fileName:            { type: String, default: '' },
        notes:               { type: String, default: '', maxlength: [2000, 'Notes cannot exceed 2000 characters'] },
        createdBy:           { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

campaignSchema.index({ campaignId: 1 });
campaignSchema.index({ status: 1 });
campaignSchema.index({ campaignName: 'text' });

// Auto-generate ID pre-save
campaignSchema.pre('save', async function (next) {
    if (this.isNew && !this.campaignId) {
        const lastDoc = await this.constructor.findOne({ campaignId: { $exists: true } }).sort({ campaignId: -1 });
        const nextNum = lastDoc && (lastDoc as any).campaignId ? parseInt((lastDoc as any).campaignId.replace('CMP-', '')) + 1 : 1001;
        this.campaignId = `CMP-${nextNum}`;
    }
    next();
});

const Campaign: Model<ICampaignDocument> = 
    mongoose.models.Campaign || mongoose.model<ICampaignDocument>('Campaign', campaignSchema);
export default Campaign;
