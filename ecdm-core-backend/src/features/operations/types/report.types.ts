import { Document, Types } from 'mongoose';

export interface IEvaluationPeriod {
    startDate: Date;
    endDate:   Date;
}

export interface IReportOperation {
    // Links to User collection — the employee being evaluated
    employee: Types.ObjectId;

    // The date range this evaluation covers (e.g., Jan 2026)
    evaluationPeriod: IEvaluationPeriod;

    // Punctuality Metrics (0–100)
    punctualityScore: number;

    // Task Completion Metrics
    taskCompletedCount: number;
    taskReturnedCount:  number;
    completionRate:     number;
    returnRate:         number;

    // Quality Metrics (1–5 stars average)
    taskQualityScore: number;

    // Weighted composite: punctuality 30% + completionRate 30% + quality 40%
    overallPerformanceScore: number;

    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface IReportOperationDocument extends IReportOperation, Document {
    _id: Types.ObjectId;
}

