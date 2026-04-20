import mongoose, { Schema, Model } from 'mongoose';
import { ICustomerOrderDocument, DevicePickupType, DealStatus, PaymentMethod, ExtraExpenseType } from '../types/customer-order.types';

/**
 * Customer Order Schema
 * 
 * Automatically generated when a Sales Order's siteInspectionDate is set.
 * Contains inherited data from Sales Order plus operational fields for engineers.
 */
const customerOrderSchema = new Schema<ICustomerOrderDocument>(
    {
        customerId:   { type: Schema.Types.ObjectId, ref: 'Customer',   required: [true, 'Customer reference is required'] },
        salesOrderId: { type: Schema.Types.ObjectId, ref: 'SalesOrder', required: [true, 'Sales order reference is required'] },
        
        // Inherited fields (copied at creation for historic snapshot, or populated dynamically)
        typeOfOrder:        { type: String, default: '' },
        issue:              { type: String, default: '' },
        scheduledVisitDate: { type: Date }, // Inherited from Sales Order's siteInspectionDate
        
        // Operational Fields (New)
        engineerName:       { type: String, default: '' }, // Or ObjectId referencing User/Employee
        actualVisitDate:    { type: Date },
        devicePickupType:   { type: String, enum: Object.values(DevicePickupType), default: DevicePickupType.NotSet },
        deal:               { type: String, enum: Object.values(DealStatus), default: DealStatus.Pending },
        cost:               { type: Number, default: 0 },
        
        // Financial Tracking (New)
        paidAmount:         { type: Number, default: 0 },
        paymentMethod:      { type: String, enum: Object.values(PaymentMethod), default: PaymentMethod.NotSet },
        spareParts:         { type: String, default: '' },
        extraExpenseType:   { type: String, enum: Object.values(ExtraExpenseType), default: ExtraExpenseType.NotSet },
        extraExpenseAmount: { type: Number, default: 0 },
        salesPercentage:    { type: Number, default: 0, min: 0, max: 100 },
        technicianPercentage: { type: Number, default: 0, min: 0, max: 100 },
        engineerPercentage:  { type: Number, default: 0, min: 0, max: 100 },

        // Personnel references — who is responsible for this order
        salesPersonId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        technicianId:  { type: Schema.Types.ObjectId, ref: 'User', default: null },
        engineerId:    { type: Schema.Types.ObjectId, ref: 'User', default: null },

        startDate:          { type: Date },
        endDate:            { type: Date },
        deviceReturnedDate: { type: Date },
        notes:              { type: String, default: '' },
        
        // Tracking
        updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }, // The user who last modified this record
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

customerOrderSchema.index({ customerId: 1 });
customerOrderSchema.index({ salesOrderId: 1 });
customerOrderSchema.index({ deal: 1 });
customerOrderSchema.index({ scheduledVisitDate: 1 });
customerOrderSchema.index({ createdAt: -1 });

const CustomerOrder: Model<ICustomerOrderDocument> = mongoose.model<ICustomerOrderDocument>('CustomerOrder', customerOrderSchema);
export default CustomerOrder;
