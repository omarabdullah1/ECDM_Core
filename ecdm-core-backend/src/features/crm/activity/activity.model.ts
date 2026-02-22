import mongoose, { Schema, Model } from 'mongoose';
import { IActivityDocument, ActivityType } from './activity.types';

const activitySchema = new Schema<IActivityDocument>(
    {
        type: { type: String, enum: Object.values(ActivityType), required: [true, 'Activity type is required'] },
        subject: { type: String, required: [true, 'Subject is required'], trim: true, maxlength: 200 },
        description: { type: String, maxlength: 3000 },
        relatedClient: { type: Schema.Types.ObjectId, ref: 'Client' },
        relatedLead: { type: Schema.Types.ObjectId, ref: 'Lead' },
        performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        date: { type: Date, default: Date.now },
        duration: { type: Number, min: 0 },
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

activitySchema.index({ type: 1 });
activitySchema.index({ relatedClient: 1 });
activitySchema.index({ relatedLead: 1 });
activitySchema.index({ performedBy: 1 });
activitySchema.index({ date: -1 });
activitySchema.index({ subject: 'text', description: 'text' });

const Activity: Model<IActivityDocument> = mongoose.model<IActivityDocument>('Activity', activitySchema);
export default Activity;
