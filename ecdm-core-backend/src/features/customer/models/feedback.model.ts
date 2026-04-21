import mongoose, { Schema, Model } from 'mongoose';
import { IFeedbackDocument } from '../types/feedback.types';
import { populateOrderContext } from '../utils/follow-up-context';

const feedbackSchema = new Schema<IFeedbackDocument>(
    {
        customerId:      { type: Schema.Types.ObjectId, ref: 'Customer',      required: [true, 'Customer reference is required'] },
        customerOrderId: { type: Schema.Types.ObjectId, ref: 'CustomerOrder', required: [true, 'Feedback must be linked to a specific order'] },
        
        // Order Context - Single Source of Truth (inherited from CustomerOrder)
        orderContext: {
            customerName: { type: String, default: '' },
            customerPhone: { type: String, default: '' },
            customerId: { type: String, default: '' },
            engineerName: { type: String, default: '' },
            visitDate: { type: Date },
            scheduledVisitDate: { type: Date },
            actualVisitDate: { type: Date },
            startDate: { type: Date },
            endDate: { type: Date },
            dealStatus: { type: String, default: '' },
            orderId: { type: String, default: '' },
        },
        
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

// ─────────────────────────────────────────────────────────────────────────────
// Middleware: Auto-populate Order Context
// ─────────────────────────────────────────────────────────────────────────────
feedbackSchema.pre('save', async function (next) {
    // Feedback is primarily linked to CustomerOrder
    const hasContext = this.orderContext && (this.orderContext.customerName || this.orderContext.customerId);
    
    if (!hasContext) {
        try {
            const context = await populateOrderContext(
                this.customerOrderId,
                this.customerId
            );
            if (context) {
                this.orderContext = context as any;
            }
        } catch (error) {
            console.error('⚠️ Feedback Middleware: Failed to populate orderContext:', error);
        }
    }
    next();
});

feedbackSchema.index({ customerId: 1 });
feedbackSchema.index({ customerOrderId: 1 });
feedbackSchema.index({ createdAt: -1 });

// Note: Post-save hook for ReportOperation removed as engineer data is now inherited from CustomerOrder

const Feedback: Model<IFeedbackDocument> = mongoose.model<IFeedbackDocument>('Feedback', feedbackSchema);
export default Feedback;
