import mongoose, { Schema, Model } from 'mongoose';
import { IFeedbackDocument } from './feedback.types';

const feedbackSchema = new Schema<IFeedbackDocument>(
    {
        // Links to WorkOrder collection — the service job being reviewed
        workOrder: {
            type:     Schema.Types.ObjectId,
            ref:      'WorkOrder',
            required: [true, 'Work order reference is required'],
        },

        // Links to Customer collection — who is giving the feedback
        customer: {
            type:     Schema.Types.ObjectId,
            ref:      'Customer',
            required: [true, 'Customer reference is required'],
        },

        /**
         * Links to User collection (MaintenanceEngineer role).
         * The ratingOperation score is automatically rolled into the engineer's
         * EmployeeEvaluation.taskQualityScore via the post-save hook below.
         */
        engineer: {
            type:     Schema.Types.ObjectId,
            ref:      'User',
            required: [true, 'Engineer reference is required'],
        },

        // Star rating for the technical/maintenance quality (1–5)
        ratingOperation: {
            type:     Number,
            required: [true, 'Operation rating is required'],
            min:      [1, 'Rating must be at least 1'],
            max:      [5, 'Rating cannot exceed 5'],
        },

        // Star rating for customer service quality (1–5)
        ratingCustomerService: {
            type:     Number,
            required: [true, 'Customer service rating is required'],
            min:      [1, 'Rating must be at least 1'],
            max:      [5, 'Rating cannot exceed 5'],
        },

        notes: { type: String, maxlength: [2000, 'Notes cannot exceed 2000 characters'] },
    },
    {
        timestamps: true,
        toJSON:     { virtuals: true },
        toObject:   { virtuals: true },
    },
);

feedbackSchema.index({ workOrder: 1 });
feedbackSchema.index({ customer:  1 });
feedbackSchema.index({ engineer:  1 });

/**
 * Post-save hook: recalculate the engineer's taskQualityScore in EmployeeEvaluation.
 *
 * After every Feedback document is saved (created or updated), this hook:
 *  1. Aggregates the average ratingOperation across ALL Feedback for this engineer.
 *  2. Upserts the EmployeeEvaluation document for the current evaluation period
 *     (defaulting to the current calendar month) with the new average.
 *  3. The EmployeeEvaluation pre-save hook then recomputes overallPerformanceScore.
 *
 * Note: Uses `mongoose.model` lazy lookup to avoid circular import at module load time.
 */
feedbackSchema.post<IFeedbackDocument>('save', async function () {
    try {
        const Feedback = mongoose.model('Feedback');
        const EmployeeEvaluation = mongoose.model('EmployeeEvaluation');

        // 1. Compute rolling average ratingOperation for this engineer
        const [agg] = await Feedback.aggregate([
            { $match: { engineer: this.engineer } },
            { $group: { _id: '$engineer', avgRating: { $avg: '$ratingOperation' } } },
        ]);
        const avgRating: number = agg ? +agg.avgRating.toFixed(2) : this.ratingOperation;

        // 2. Determine the current evaluation period (current calendar month)
        const now      = new Date();
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const periodEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        // 3. Upsert the evaluation document; pre-save hook recalculates overallPerformanceScore
        await EmployeeEvaluation.findOneAndUpdate(
            {
                employee: this.engineer,
                'evaluationPeriod.startDate': { $gte: periodStart },
                'evaluationPeriod.endDate':   { $lte: periodEnd },
            },
            {
                $set: {
                    taskQualityScore:    avgRating,
                    'evaluationPeriod.startDate': periodStart,
                    'evaluationPeriod.endDate':   periodEnd,
                },
                $setOnInsert: { employee: this.engineer },
            },
            { upsert: true, new: true, runValidators: true },
        );
    } catch (err) {
        // Log but do not throw — feedback save should not fail due to evaluation update
        console.error('[Feedback post-save] Failed to update EmployeeEvaluation:', err);
    }
});

const Feedback: Model<IFeedbackDocument> =
    mongoose.model<IFeedbackDocument>('Feedback', feedbackSchema);

export default Feedback;
