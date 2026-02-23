import { Document, Types } from 'mongoose';

export interface IFeedback {
    // Links to WorkOrder collection — the job being rated
    workOrder: Types.ObjectId;

    // Links to Customer collection — who submitted the feedback
    customer: Types.ObjectId;

    /**
     * Links to User collection (MaintenanceEngineer role) — the engineer whose
     * work quality is being scored. This rating feeds into the engineer's
     * EmployeeEvaluation.taskQualityScore via a post-save hook.
     */
    engineer: Types.ObjectId;

    /**
     * Star rating (1–5) for the quality of the maintenance/technical work.
     * Triggers an automatic recalculation of the engineer's EmployeeEvaluation
     * taskQualityScore (rolling average across all Feedback records for that engineer).
     */
    ratingOperation:       number; // 1–5 stars — Engineer quality

    /**
     * Star rating (1–5) for the quality of customer service interactions.
     */
    ratingCustomerService: number; // 1–5 stars — CSR quality

    notes?:    string;
    createdAt: Date;
    updatedAt: Date;
}

export interface IFeedbackDocument extends IFeedback, Document {
    _id: Types.ObjectId;
}
