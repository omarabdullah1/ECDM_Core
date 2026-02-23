import mongoose, { Schema, Model } from 'mongoose';
import { ISalesOrderDocument, QuotationStatus, SalesOrderFinalStatus } from '../types/sales-order.types';

const salesOrderSchema = new Schema<ISalesOrderDocument>(
    {
        // Origin: either from inbound SalesLead or from cold-call SalesData
        salesLead: { type: Schema.Types.ObjectId, ref: 'SalesLead' },
        salesData: { type: Schema.Types.ObjectId, ref: 'SalesData' },

        // The customer is always required (single source of truth)
        customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: [true, 'Customer reference is required'] },

        issueDescription:           { type: String, required: [true, 'Issue description is required'], trim: true, maxlength: [2000, 'Description cannot exceed 2000 characters'] },
        siteInspectionDate:         { type: Date },
        technicalInspection:        { type: Boolean, default: false },
        technicalInspectionDetails: { type: String, maxlength: [2000, 'Technical inspection details too long'] },
        quotationNumber:            { type: String, trim: true },
        quotationStatus:            { type: String, enum: Object.values(QuotationStatus),          default: QuotationStatus.Pending },
        finalStatus:                { type: String, enum: Object.values(SalesOrderFinalStatus),    default: SalesOrderFinalStatus.Pending },
        notes:                      { type: String, maxlength: [2000, 'Notes cannot exceed 2000 characters'] },
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

salesOrderSchema.index({ salesLead:       1 });
salesOrderSchema.index({ salesData:       1 });
salesOrderSchema.index({ customer:        1 });
salesOrderSchema.index({ quotationStatus: 1 });
salesOrderSchema.index({ finalStatus:     1 });

const SalesOrder: Model<ISalesOrderDocument> = mongoose.model<ISalesOrderDocument>('SalesOrder', salesOrderSchema);
export default SalesOrder;
