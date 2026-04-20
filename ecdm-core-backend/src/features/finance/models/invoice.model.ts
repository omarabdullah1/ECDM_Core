import mongoose, { Schema, Model } from 'mongoose';
import { IInvoiceDocument, InvoiceStatus } from '../types/invoice.types';

const invoiceItemSchema = new Schema(
    {
        description: { type: String, required: true, trim: true },
        quantity:    { type: Number, required: true, min: 1 },
        unitPrice:   { type: Number, required: true, min: 0 },
        inventoryItemId: { type: Schema.Types.ObjectId, ref: 'InventoryFinance' },
        priceListId:     { type: Schema.Types.ObjectId, ref: 'PriceList' },
    },
    { _id: false },
);

const paymentSchema = new Schema(
    {
        amount: { type: Number, required: true, min: 0 },
        date:   { type: Date, default: Date.now },
        method: { type: String, required: true },
        notes:  { type: String, trim: true },
        recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true }
);

const invoiceSchema = new Schema<IInvoiceDocument>(
    {
        invoiceNumber: { type: String, required: true, unique: true },
        customerId:    { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
        salesOrderId:  { type: Schema.Types.ObjectId, ref: 'SalesOrder' },
        items:         { type: [invoiceItemSchema], required: true, validate: [(v: any[]) => v.length > 0, 'At least one item is required'] },
        subTotal:      { type: Number, default: 0 },
        tax:           { type: Number, default: 0 },
        grandTotal:    { type: Number, default: 0 },
        paidAmount:    { type: Number, default: 0 },
        payments:      { type: [paymentSchema], default: [] },
        isStockDeducted: { type: Boolean, default: false },
        status: {
            type:    String,
            enum:    Object.values(InvoiceStatus),
            default: InvoiceStatus.Pending,
        },
        approvedBy:   { type: Schema.Types.ObjectId, ref: 'User' },
        approvalDate: { type: Date },
        notes:        { type: String, maxlength: 2000 },
    },
    {
        timestamps: true,
        toJSON:     { virtuals: true },
        toObject:   { virtuals: true },
    },
);

// Auto-calculate totals before saving
invoiceSchema.pre<IInvoiceDocument>('save', function (next) {
    this.subTotal = this.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    this.grandTotal = this.subTotal + this.tax;
    next();
});

invoiceSchema.index({ customerId:    1 });
invoiceSchema.index({ salesOrderId:  1 });
invoiceSchema.index({ status:        1 });
invoiceSchema.index({ createdAt:     -1 });

const Invoice: Model<IInvoiceDocument> = mongoose.model<IInvoiceDocument>('FinanceInvoice', invoiceSchema);
export default Invoice;
