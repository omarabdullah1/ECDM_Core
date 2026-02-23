import mongoose, { Schema, Model } from 'mongoose';
import { IEmployeeEvaluationDocument } from './employee-evaluation.types';

// ── Sub-document: evaluation period ──────────────────────────────────────────
const evaluationPeriodSchema = new Schema(
    {
        startDate: { type: Date, required: true },
        endDate:   { type: Date, required: true },
    },
    { _id: false },
);

// ── Main EmployeeEvaluation schema ────────────────────────────────────────────
const employeeEvaluationSchema = new Schema<IEmployeeEvaluationDocument>(
    {
        // Links to User collection — the employee whose performance is being evaluated
        employee: {
            type:     Schema.Types.ObjectId,
            ref:      'User',
            required: [true, 'Employee reference is required'],
        },

        evaluationPeriod: {
            type:     evaluationPeriodSchema,
            required: true,
        },

        // ── Punctuality (0–100) ───────────────────────────────────────────────
        // Percentage of this engineer's WorkOrders marked "On-Time" in the period
        punctualityScore: {
            type:    Number,
            default: 0,
            min:     [0, 'Score cannot be negative'],
            max:     [100, 'Score cannot exceed 100'],
        },

        // ── Task Completion Metrics ───────────────────────────────────────────
        taskCompletedCount: { type: Number, default: 0, min: 0 },
        taskReturnedCount:  { type: Number, default: 0, min: 0 },

        // Derived percentages — stored for queryability; recomputed by service layer
        completionRate: {
            type:    Number,
            default: 0,
            min:     [0,   'Rate cannot be negative'],
            max:     [100, 'Rate cannot exceed 100'],
        },
        returnRate: {
            type:    Number,
            default: 0,
            min:     [0,   'Rate cannot be negative'],
            max:     [100, 'Rate cannot exceed 100'],
        },

        // ── Quality Metrics (1–5) ─────────────────────────────────────────────
        // Rolling average of Feedback.ratingOperation for this engineer's WorkOrders.
        // Auto-updated by the Feedback post-save hook (see feedback.model.ts).
        taskQualityScore: {
            type:    Number,
            default: 0,
            min:     [0, 'Quality score cannot be negative'],
            max:     [5, 'Quality score cannot exceed 5'],
        },

        // ── Overall Performance (0–100) ───────────────────────────────────────
        // Formula: punctuality * 0.30 + completionRate * 0.30 + (taskQualityScore / 5 * 100) * 0.40
        overallPerformanceScore: {
            type:    Number,
            default: 0,
            min:     [0,   'Score cannot be negative'],
            max:     [100, 'Score cannot exceed 100'],
        },

        notes: { type: String, maxlength: [2000, 'Notes cannot exceed 2000 characters'] },
    },
    {
        timestamps: true,
        toJSON:     { virtuals: true },
        toObject:   { virtuals: true },
    },
);

// One evaluation document per employee per period — prevent duplicates
employeeEvaluationSchema.index(
    { employee: 1, 'evaluationPeriod.startDate': 1 },
    { unique: true },
);
employeeEvaluationSchema.index({ employee:               1 });
employeeEvaluationSchema.index({ overallPerformanceScore:1 });

/**
 * Recomputes the overallPerformanceScore before every save.
 * Weighted formula: punctuality 30% + completionRate 30% + quality (normalised) 40%
 */
employeeEvaluationSchema.pre<IEmployeeEvaluationDocument>('save', function (next) {
    const qualityNormalised = (this.taskQualityScore / 5) * 100;
    this.overallPerformanceScore = Math.round(
        this.punctualityScore * 0.30 +
        this.completionRate   * 0.30 +
        qualityNormalised     * 0.40,
    );
    next();
});

const EmployeeEvaluation: Model<IEmployeeEvaluationDocument> =
    mongoose.model<IEmployeeEvaluationDocument>('EmployeeEvaluation', employeeEvaluationSchema);

export default EmployeeEvaluation;
