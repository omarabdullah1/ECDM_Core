import mongoose, { Schema, Model } from 'mongoose';
import { IFollowUpDocument, FollowUpStatus } from '../types/follow-up.types';

const followUpSchema = new Schema<IFollowUpDocument>(
    {
        // Source references (at least one should be set, or it's a manual entry)
        workOrder:   { type: Schema.Types.ObjectId, ref: 'WorkOrder' },
        leadId:      { type: Schema.Types.ObjectId, ref: 'SalesLead' },
        salesDataId: { type: Schema.Types.ObjectId, ref: 'SalesData' },
        
        customer:  { type: Schema.Types.ObjectId, ref: 'Customer',  required: [true, 'Customer reference is required'] },
        csr:       { type: Schema.Types.ObjectId, ref: 'User' },
        
        status: { 
            type: String, 
            enum: Object.values(FollowUpStatus), 
            default: FollowUpStatus.Pending,
            index: true,
        },
        solvedIssue:          { type: Boolean, default: false },  // Legacy field, auto-synced with status
        reasonForNotSolving:  { type: String, maxlength: [1000, 'Reason cannot exceed 1000 characters'] },
        followUpDate:         { type: Date,    required: [true, 'Follow-up date is required'] },
        notes:                { type: String, maxlength: [2000, 'Notes cannot exceed 2000 characters'] },
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

followUpSchema.index({ workOrder:    1 });
followUpSchema.index({ leadId:       1 });
followUpSchema.index({ salesDataId:  1 });
followUpSchema.index({ customer:     1 });
followUpSchema.index({ csr:          1 });
followUpSchema.index({ followUpDate: 1 });
followUpSchema.index({ solvedIssue:  1 });

// Middleware: Auto-sync solvedIssue with status for backward compatibility
followUpSchema.pre('save', function(next) {
    if (this.isModified('status')) {
        this.solvedIssue = this.status === FollowUpStatus.Completed;
    }
    next();
});

const FollowUp: Model<IFollowUpDocument> = mongoose.model<IFollowUpDocument>('FollowUp', followUpSchema);
export default FollowUp;
