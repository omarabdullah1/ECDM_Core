import mongoose, { Schema, Model } from 'mongoose';
import { ICampaignDocument, CampaignPlatform, CampaignStatus } from './campaign.types';

const campaignSchema = new Schema<ICampaignDocument>(
    {
        name: {
            type:      String,
            required:  [true, 'Campaign name is required'],
            trim:      true,
            maxlength: [200, 'Campaign name cannot exceed 200 characters'],
        },
        platform: {
            type:     String,
            enum:     Object.values(CampaignPlatform),
            required: [true, 'Platform is required'],
        },
        status: {
            type:    String,
            enum:    Object.values(CampaignStatus),
            default: CampaignStatus.Future,
        },
        impressions:  { type: Number, min: [0, 'Impressions cannot be negative'],  default: 0 },
        conversions:  { type: Number, min: [0, 'Conversions cannot be negative'],   default: 0 },
        salesRevenue: { type: Number, min: [0, 'Sales revenue cannot be negative'], default: 0 },
        budget:       { type: Number, min: [0, 'Budget cannot be negative'] },
        startDate:    { type: Date },
        endDate:      { type: Date },
        notes:        { type: String, maxlength: [2000, 'Notes cannot exceed 2000 characters'] },
    },
    {
        timestamps: true,
        toJSON:     { virtuals: true },
        toObject:   { virtuals: true },
    },
);

campaignSchema.index({ platform: 1 });
campaignSchema.index({ status:   1 });
campaignSchema.index({ name: 'text' });

// Virtual: conversion rate percentage
campaignSchema.virtual('conversionRate').get(function () {
    if (!this.impressions || this.impressions === 0) return 0;
    return +((this.conversions! / this.impressions) * 100).toFixed(2);
});

const Campaign: Model<ICampaignDocument> =
    mongoose.model<ICampaignDocument>('Campaign', campaignSchema);

export default Campaign;
