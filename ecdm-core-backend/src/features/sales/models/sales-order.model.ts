import mongoose, { Schema, Model } from 'mongoose';
import { ISalesOrderDocument, QuotationStatus, SalesOrderFinalStatus, OrderStatus, SecondFollowUpStatus, ThirdFollowUpStatus } from '../types/sales-order.types';
import { getNextSequence } from '../../shared/models/counter.model';

const salesOrderSchema = new Schema<ISalesOrderDocument>(
    {
        // Human-readable unique ID (e.g., "SO-1001", "SO-1002")
        // Auto-generated on creation via pre-save hook
        salesOrderId: {
            type: String,
            unique: true,
            index: true,
        },

        // Origin: either from inbound SalesLead or from cold-call SalesData
        salesLead: { type: Schema.Types.ObjectId, ref: 'SalesLead', index: true },
        salesData: { type: Schema.Types.ObjectId, ref: 'SalesData', index: true },

        // The customer is always required (single source of truth)
        customer: { type: Schema.Types.ObjectId, ref: 'Customer', required: [true, 'Customer reference is required'], index: true },

        // Salesperson assigned to this order (for performance tracking)
        salesPerson: { type: Schema.Types.ObjectId, ref: 'User', index: true },

        // Order lifecycle status - controls conditional workflow logic
        orderStatus: {
            type: String,
            enum: Object.values(OrderStatus),
            default: OrderStatus.Pending,
            index: true,
        },

        issueDescription: { type: String, required: [true, 'Issue description is required'], trim: true, maxlength: [2000, 'Description cannot exceed 2000 characters'] },
        issue: { type: String, default: '', trim: true, maxlength: [2000, 'Issue cannot exceed 2000 characters'] },
        typeOfOrder: { type: String, enum: ['Maintenance', 'General supplies', 'Supply and installation', ''], default: '', trim: true },
        salesPlatform: { type: String, trim: true },
        siteInspectionDate: { type: Date },

        // Technical Inspection (Conditional - CEO-Approved Architecture)
        isTechnicalInspectionRequired: { type: Boolean, default: false },
        technicalInspectionDate: { type: Date },
        technicalInspectionDetails: { type: String, maxlength: [2000, 'Technical inspection details too long'] },

        // Quotation File Upload (CEO-Approved Replacement for quotationNumber)
        quotationFileUrl: { type: String, trim: true },
        quotationFileName: { type: String, trim: true },

        // Dynamic Quotation Builder (stores structured quotation data)
        quotation: {
            items: [{
                description: { type: String, required: true },
                quantity: { type: Number, required: true, default: 1 },
                unitPrice: { type: Number, required: true, default: 0 },
                total: { type: Number, required: true, default: 0 }
            }],
            subTotal: { type: Number, default: 0 },
            discount: { type: Number, default: 0 },
            grandTotal: { type: Number, default: 0 },
            notes: { type: String, default: '' },
            createdAt: { type: Date }
        },

        // First Follow-Up
        followUpFirst: { type: Date },
        quotationStatusFirstFollowUp: { type: String, enum: Object.values(QuotationStatus) },
        reasonOfQuotation: { type: String, trim: true, maxlength: [1000, 'Reason cannot exceed 1000 characters'] },

        // Second Follow-Up
        followUpSecond: { type: Date },
        statusSecondFollowUp: { type: String, enum: [...Object.values(SecondFollowUpStatus), ''], default: '' },

        // Third Follow-Up
        followUpThird: { type: Date },
        finalStatusThirdFollowUp: { type: String, enum: [...Object.values(ThirdFollowUpStatus), ''], default: '' },

        // Legacy fields (kept for backward compatibility)
        quotationStatus: { type: String, enum: Object.values(QuotationStatus), default: QuotationStatus.Pending },
        finalStatus: { type: String, enum: Object.values(SalesOrderFinalStatus), default: SalesOrderFinalStatus.Pending },

        notes: { type: String, maxlength: [2000, 'Notes cannot exceed 2000 characters'] },
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

// Pre-save hook to auto-generate salesOrderId (SO-1001, SO-1002, etc.)
salesOrderSchema.pre('save', async function (next) {
    if (!this.salesOrderId) {
        const seq = await getNextSequence('sales-order');
        this.salesOrderId = `SO-${seq}`;
    }
    next();
});

const SalesOrder: Model<ISalesOrderDocument> = mongoose.model<ISalesOrderDocument>('SalesOrder', salesOrderSchema);
export default SalesOrder;
