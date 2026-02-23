import mongoose, { Schema, Model } from 'mongoose';
import { IFollowUpDocument } from './follow-up.types';

const followUpSchema = new Schema<IFollowUpDocument>(
    {
        // Links to WorkOrder collection — the job this follow-up is about
        workOrder: {
            type:     Schema.Types.ObjectId,
            ref:      'WorkOrder',
            required: [true, 'Work order reference is required'],
        },

        // Links to Customer collection — who the follow-up is with
        customer: {
            type:     Schema.Types.ObjectId,
            ref:      'Customer',
            required: [true, 'Customer reference is required'],
        },

        // Links to User collection (CustomerService role) — the CSR conducting the call
        csr: {
            type:     Schema.Types.ObjectId,
            ref:      'User',
            required: [true, 'CSR reference is required'],
        },

        solvedIssue: {
            type:     Boolean,
            required: [true, 'solvedIssue flag is required'],
        },

        reasonForNotSolving: {
            type:      String,
            maxlength: [1000, 'Reason cannot exceed 1000 characters'],
        },

        followUpDate: {
            type:     Date,
            required: [true, 'Follow-up date is required'],
        },

        notes: { type: String, maxlength: [2000, 'Notes cannot exceed 2000 characters'] },
    },
    {
        timestamps: true,
        toJSON:     { virtuals: true },
        toObject:   { virtuals: true },
    },
);

followUpSchema.index({ workOrder:    1 });
followUpSchema.index({ customer:     1 });
followUpSchema.index({ csr:          1 });
followUpSchema.index({ followUpDate: 1 });
followUpSchema.index({ solvedIssue:  1 }); // filter unresolved cases quickly

const FollowUp: Model<IFollowUpDocument> =
    mongoose.model<IFollowUpDocument>('FollowUp', followUpSchema);

export default FollowUp;
