import mongoose, { Schema, Model } from 'mongoose';
import { IFollowUpDocument, FollowUpStatus } from '../types/follow-up.types';

const followUpSchema = new Schema<IFollowUpDocument>(
    {
        // Source references (at least one should be set, or it's a manual entry)
        workOrder:      { type: Schema.Types.ObjectId, ref: 'WorkOrder' },
        leadId:         { type: Schema.Types.ObjectId, ref: 'SalesLead' },
        salesDataId:    { type: Schema.Types.ObjectId, ref: 'SalesData' },
        customerOrderId: { type: Schema.Types.ObjectId, ref: 'CustomerOrder' },  // Reference to Customer Order for QC pipeline
        
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
        
        customer:  { type: Schema.Types.ObjectId, ref: 'Customer',  required: [true, 'Customer reference is required'] },
        csr:       { type: Schema.Types.ObjectId, ref: 'User' },
        
        status: { 
            type: String, 
            enum: Object.values(FollowUpStatus), 
            default: FollowUpStatus.Pending,
            index: true,
        },
        
        // Quality Control Fields
        punctuality:           { type: String, enum: ['Same Visit Time', 'Late', ''], default: '' },
        reasonForDelay:        { type: String, default: '' },
        solvedIssue:           { type: String, enum: ['Yes', 'No', ''], default: '' },  // Changed from Boolean to String enum for QC
        reasonForNotSolving:   { type: String, maxlength: [1000, 'Reason cannot exceed 1000 characters'] },
        followUp:              { type: Boolean, default: null },
        
        followUpDate:  { type: Date,    required: [true, 'Follow-up date is required'] },
        notes:         { type: String, maxlength: [2000, 'Notes cannot exceed 2000 characters'] },
        
        // Tracking
        updatedBy:     { type: Schema.Types.ObjectId, ref: 'User' },  // User who last modified this record
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

followUpSchema.index({ workOrder:       1 });
followUpSchema.index({ leadId:          1 });
followUpSchema.index({ salesDataId:     1 });
followUpSchema.index({ customerOrderId: 1 });  // New index
followUpSchema.index({ customer:        1 });
followUpSchema.index({ csr:             1 });
followUpSchema.index({ followUpDate:    1 });
followUpSchema.index({ solvedIssue:     1 });

const FollowUp: Model<IFollowUpDocument> = mongoose.model<IFollowUpDocument>('FollowUp', followUpSchema);
export default FollowUp;
