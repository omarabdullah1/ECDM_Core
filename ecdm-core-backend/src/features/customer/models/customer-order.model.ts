import mongoose, { Schema, Model } from 'mongoose';
import { ICustomerOrderDocument, CustomerOrderStatus } from '../types/customer-order.types';

const customerOrderSchema = new Schema<ICustomerOrderDocument>(
    {
        customer:   { type: Schema.Types.ObjectId, ref: 'Customer',   required: [true, 'Customer reference is required'] },
        salesOrder: { type: Schema.Types.ObjectId, ref: 'SalesOrder', required: [true, 'Sales order reference is required'] },
        workOrders: [{ type: Schema.Types.ObjectId, ref: 'WorkOrder' }],

        serviceDescription: { type: String, required: [true, 'Service description is required'], trim: true, maxlength: [2000, 'Description cannot exceed 2000 characters'] },
        scheduledDate:      { type: Date },
        completedDate:      { type: Date },
        status: { type: String, enum: Object.values(CustomerOrderStatus), default: CustomerOrderStatus.Pending },
        notes:  { type: String, maxlength: [2000, 'Notes cannot exceed 2000 characters'] },
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

customerOrderSchema.index({ customer:   1 });
customerOrderSchema.index({ salesOrder: 1 });
customerOrderSchema.index({ status:     1 });
customerOrderSchema.index({ scheduledDate: 1 });

const CustomerOrder: Model<ICustomerOrderDocument> = mongoose.model<ICustomerOrderDocument>('CustomerOrder', customerOrderSchema);
export default CustomerOrder;
