import { Document, Types } from 'mongoose';

/**
 * Evaluation period defines the date range this evaluation snapshot covers.
 * Typically monthly or quarterly.
 */
export interface IEvaluationPeriod {
    startDate: Date;
    endDate:   Date;
}

export interface IEmployeeEvaluation {
    // Links to User collection — the employee being evaluated (auth identity)
    employee: Types.ObjectId;

    // The date range this evaluation covers (e.g. Jan 2026)
    evaluationPeriod: IEvaluationPeriod;

    // --- Punctuality Metrics ---
    // Aggregated from WorkOrder.punctuality for this engineer in the period
    punctualityScore: number; // 0–100 (percentage of On-Time work orders)

    // --- Task Completion Metrics ---
    // Aggregated from WorkOrder records assigned to this engineer
    taskCompletedCount: number; // Total work orders completed
    taskReturnedCount:  number; // Work orders returned / reworked
    completionRate:     number; // completedCount / totalAssigned * 100
    returnRate:         number; // returnedCount  / totalAssigned * 100

    // --- Quality Metrics ---
    // Average of Feedback.ratingOperation for this engineer's work orders
    // Auto-updated by Feedback post-save hook
    taskQualityScore: number; // 1–5 stars

    // --- Summary ---
    // Weighted composite: punctuality 30% + completionRate 30% + quality 40%
    overallPerformanceScore: number; // 0–100

    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface IEmployeeEvaluationDocument extends IEmployeeEvaluation, Document {
    _id: Types.ObjectId;
}
