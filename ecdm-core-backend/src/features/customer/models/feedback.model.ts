import mongoose, { Schema, Model } from 'mongoose';
import { IFeedbackDocument } from '../types/feedback.types';

const feedbackSchema = new Schema<IFeedbackDocument>(
    {
        customerId:      { type: Schema.Types.ObjectId, ref: 'Customer',      required: [true, 'Customer reference is required'] },
        customerOrderId: { type: Schema.Types.ObjectId, ref: 'CustomerOrder' }, // To inherit Engineer & Dates
        
        // Feedback specific fields
        solvedIssue:           { type: String, enum: ['Yes', 'No', ''], default: '' },
        ratingOperation:       { type: String, default: '' }, // e.g., '1 to 5', 'Excellent', etc.
        followUp:              { type: String, enum: ['Yes', 'No', ''], default: '' }, // Does this need another follow-up?
        ratingCustomerService: { type: String, default: '' },
        notes:                 { type: String, default: '' },
        
        // Audit
        updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

feedbackSchema.index({ customerId: 1 });
feedbackSchema.index({ customerOrderId: 1 });
feedbackSchema.index({ createdAt: -1 });

// Note: Post-save hook for ReportOperation removed as engineer data is now inherited from CustomerOrder

const Feedback: Model<IFeedbackDocument> = mongoose.model<IFeedbackDocument>('Feedback', feedbackSchema);
export default Feedback;
