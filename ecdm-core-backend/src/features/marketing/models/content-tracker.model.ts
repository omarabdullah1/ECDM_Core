import mongoose, { Schema, Model } from 'mongoose';
import { IContentTrackerDocument, ContentType, ContentStatus } from './content-tracker.types';

const contentTrackerSchema = new Schema<IContentTrackerDocument>(
    {
        name:     { type: String, required: [true, 'Content name is required'], trim: true, maxlength: [200, 'Name cannot exceed 200 characters'] },
        type:     { type: String, enum: Object.values(ContentType),   required: [true, 'Content type is required'] },
        status:   { type: String, enum: Object.values(ContentStatus), default: ContentStatus.New },
        sector:   { type: String, trim: true },
        postDate: { type: Date },
        notes:    { type: String, maxlength: [2000, 'Notes cannot exceed 2000 characters'] },
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

contentTrackerSchema.index({ type:     1 });
contentTrackerSchema.index({ status:   1 });
contentTrackerSchema.index({ postDate: 1 });
contentTrackerSchema.index({ name: 'text' });

const ContentTracker: Model<IContentTrackerDocument> =
    mongoose.model<IContentTrackerDocument>('ContentTracker', contentTrackerSchema);
export default ContentTracker;
