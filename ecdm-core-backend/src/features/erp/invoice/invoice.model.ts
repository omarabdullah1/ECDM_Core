import mongoose, { Schema, Model } from 'mongoose';
import { IInvoiceDocument, InvoiceStatus } from './invoice.types';

const invoiceItemSchema = new Schema(
    {
        description: { type: String, required: true, trim: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
    },
    { _id: false },
);

const invoiceSchema = new Schema<IInvoiceDocument>(
    {
        invoiceNumber: { type: String, required: true, unique: true },
        client: { type: Schema.Types.ObjectId, ref: 'Client' },
        items: { type: [invoiceItemSchema], required: true, validate: [(v: unknown[]) => v.length > 0, 'At least one item is required'] },
        subtotal: { type: Number, default: 0 },
        tax: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        status: { type: String, enum: Object.values(InvoiceStatus), default: InvoiceStatus.Draft },
        issueDate: { type: Date, default: Date.now },
        dueDate: { type: Date },
        paidAt: { type: Date },
        notes: { type: String, maxlength: 2000 },
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

// Auto-calculate totals
invoiceSchema.pre<IInvoiceDocument>('save', function (next) {
    this.subtotal = this.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    this.total = this.subtotal + this.tax;
    if (this.isModified('status') && this.status === InvoiceStatus.Paid && !this.paidAt) {
        this.paidAt = new Date();
    }
    next();
});

invoiceSchema.index({ status: 1 });
invoiceSchema.index({ client: 1 });
invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ issueDate: -1 });

const Invoice: Model<IInvoiceDocument> = mongoose.model<IInvoiceDocument>('Invoice', invoiceSchema);
export default Invoice;
