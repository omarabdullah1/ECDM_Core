import mongoose, { Schema, Model } from 'mongoose';
import { IReportOperationDocument } from '../types/report.types';

const evaluationPeriodSchema = new Schema(
    {
        startDate: { type: Date, required: true },
        endDate:   { type: Date, required: true },
    },
    { _id: false },
);

const reportOperationSchema = new Schema<IReportOperationDocument>(
    {
        employee: {
            type:     Schema.Types.ObjectId,
            ref:      'User',
            required: [true, 'Employee reference is required'],
        },
        evaluationPeriod: {
            type:     evaluationPeriodSchema,
            required: true,
        },
        punctualityScore: {
            type:    Number,
            default: 0,
            min:     [0, 'Score cannot be negative'],
            max:     [100, 'Score cannot exceed 100'],
        },
        taskCompletedCount: { type: Number, default: 0, min: 0 },
        taskReturnedCount:  { type: Number, default: 0, min: 0 },
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
        taskQualityScore: {
            type:    Number,
            default: 0,
            min:     [0, 'Quality score cannot be negative'],
            max:     [5, 'Quality score cannot exceed 5'],
        },
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

// Prevent duplicates: one report per employee per period
reportOperationSchema.index(
    { employee: 1, 'evaluationPeriod.startDate': 1 },
    { unique: true },
);
reportOperationSchema.index({ employee:               1 });
reportOperationSchema.index({ overallPerformanceScore: 1 });

// Recompute overall score before every save
reportOperationSchema.pre<IReportOperationDocument>('save', function (next) {
    const qualityNormalised = (this.taskQualityScore / 5) * 100;
    this.overallPerformanceScore = Math.round(
        this.punctualityScore * 0.30 +
        this.completionRate   * 0.30 +
        qualityNormalised     * 0.40,
    );
    next();
});

const ReportOperation: Model<IReportOperationDocument> =
    mongoose.model<IReportOperationDocument>('ReportOperation', reportOperationSchema);

export default ReportOperation;

