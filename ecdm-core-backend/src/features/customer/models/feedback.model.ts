import mongoose, { Schema, Model } from 'mongoose';
import { IFeedbackDocument } from '../types/feedback.types';

const feedbackSchema = new Schema<IFeedbackDocument>(
    {
        workOrder: { type: Schema.Types.ObjectId, ref: 'WorkOrder', required: [true, 'Work order reference is required'] },
        customer:  { type: Schema.Types.ObjectId, ref: 'Customer',  required: [true, 'Customer reference is required'] },
        engineer:  { type: Schema.Types.ObjectId, ref: 'User',      required: [true, 'Engineer reference is required'] },
        ratingOperation:       { type: Number, required: [true, 'Operation rating is required'],       min: [1, 'Rating must be at least 1'], max: [5, 'Rating cannot exceed 5'] },
        ratingCustomerService: { type: Number, required: [true, 'Customer service rating is required'], min: [1, 'Rating must be at least 1'], max: [5, 'Rating cannot exceed 5'] },
        notes: { type: String, maxlength: [2000, 'Notes cannot exceed 2000 characters'] },
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

feedbackSchema.index({ workOrder: 1 });
feedbackSchema.index({ customer:  1 });
feedbackSchema.index({ engineer:  1 });

/**
 * Post-save hook: recalculate the engineer's taskQualityScore in ReportOperation.
 * Uses lazy mongoose model lookup to avoid circular imports.
 */
feedbackSchema.post<IFeedbackDocument>('save', async function () {
    try {
        const Feedback         = mongoose.model('Feedback');
        const ReportOperation  = mongoose.model('ReportOperation');

        const [agg] = await Feedback.aggregate([
            { $match: { engineer: this.engineer } },
            { $group: { _id: '$engineer', avgRating: { $avg: '$ratingOperation' } } },
        ]);
        const avgRating: number = agg ? +agg.avgRating.toFixed(2) : this.ratingOperation;

        const now         = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const periodEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        await ReportOperation.findOneAndUpdate(
            {
                employee: this.engineer,
                'evaluationPeriod.startDate': { $gte: periodStart },
                'evaluationPeriod.endDate':   { $lte: periodEnd },
            },
            {
                $set: {
                    taskQualityScore:             avgRating,
                    'evaluationPeriod.startDate': periodStart,
                    'evaluationPeriod.endDate':   periodEnd,
                },
            },
            { upsert: true },
        );
    } catch (err) {
        console.error('Feedback post-save hook error:', err);
    }
});

const Feedback: Model<IFeedbackDocument> = mongoose.model<IFeedbackDocument>('Feedback', feedbackSchema);
export default Feedback;
