import mongoose, { Schema, Model } from 'mongoose';
import { IContentTrackerDocument, ContentType, ContentStatus } from './content-tracker.types';

const contentTrackerSchema = new Schema<IContentTrackerDocument>(
    {
        contentId:    { type: String, unique: true, sparse: true },
        contentTitle: { type: String, required: [true, 'Content title is required'], trim: true, maxlength: [200, 'Title cannot exceed 200 characters'] },
        type:         { type: String, enum: [...Object.values(ContentType), ''], default: '' },
        details:      { type: String, default: '' },
        owner:        { type: String, default: '' },
        status:       { type: String, enum: [...Object.values(ContentStatus), ''], default: 'New' },
        postDate:     { type: Date },
        fileUrl:      { type: String, default: '' },
        fileName:     { type: String, default: '' },
        notes:        { type: String, default: '', maxlength: [2000, 'Notes cannot exceed 2000 characters'] },
        createdBy:    { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

contentTrackerSchema.index({ type: 1 });
contentTrackerSchema.index({ status: 1 });
contentTrackerSchema.index({ postDate: 1 });
contentTrackerSchema.index({ contentTitle: 'text' });

// Auto-generate ID pre-save
contentTrackerSchema.pre('save', async function (next) {
    if (this.isNew && !this.contentId) {
        const lastDoc = await this.constructor.findOne({ contentId: { $exists: true } }).sort({ contentId: -1 });
        const nextNum = lastDoc && (lastDoc as any).contentId ? parseInt((lastDoc as any).contentId.replace('CNT-', '')) + 1 : 1001;
        this.contentId = `CNT-${nextNum}`;
    }
    next();
});

const ContentTracker: Model<IContentTrackerDocument> =
    mongoose.models.ContentTracker || mongoose.model<IContentTrackerDocument>('ContentTracker', contentTrackerSchema);
export default ContentTracker;
