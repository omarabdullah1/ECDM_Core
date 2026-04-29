import mongoose, { Document, Model, Schema } from 'mongoose';
import { getNextSequence } from '../../shared/models/counter.model';

export enum PurchaseOrderStatus {
    PendingFinance = 'PendingFinance',
    ApprovedFinance = 'ApprovedFinance',
    Received = 'Received',
    Rejected = 'Rejected'
}

export interface IPurchaseOrderItem {
    inventoryId: mongoose.Types.ObjectId;
    itemName: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

export interface IPurchaseOrderDocument extends Document {
    poNumber: string;
    supplierName: string;
    items: IPurchaseOrderItem[];
    totalAmount: number;
    status: PurchaseOrderStatus;
    financeApprovedBy?: mongoose.Types.ObjectId;
    financeApprovedAt?: Date;
    receivedBy?: mongoose.Types.ObjectId;
    receivedAt?: Date;
    createdBy: mongoose.Types.ObjectId;
    notes: string;
    createdAt: Date;
    updatedAt: Date;
}

const purchaseOrderItemSchema = new Schema<IPurchaseOrderItem>({
    inventoryId: { type: Schema.Types.ObjectId, ref: 'Inventory', required: true },
    itemName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0, min: 0 }
}, { _id: false });

const purchaseOrderSchema = new Schema<IPurchaseOrderDocument>(
    {
        poNumber: {
            type: String,
            unique: true,
            index: true,
        },
        supplierName: {
            type: String,
            trim: true,
            default: '',
        },
        items: [purchaseOrderItemSchema],
        totalAmount: {
            type: Number,
            default: 0,
            min: [0, 'Total amount cannot be negative'],
        },
        status: {
            type: String,
            enum: Object.values(PurchaseOrderStatus),
            default: PurchaseOrderStatus.PendingFinance,
        },
        financeApprovedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        financeApprovedAt: {
            type: Date,
        },
        receivedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
        receivedAt: {
            type: Date,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        notes: {
            type: String,
            default: '',
            maxlength: [2000, 'Notes cannot exceed 2000 characters'],
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

purchaseOrderSchema.pre('save', async function (next) {
    if (!this.poNumber) {
        const seq = await getNextSequence('purchase-order');
        this.poNumber = `PO-${seq}`;
    }
    
    // Calculate total amount if items changed
    if (this.isModified('items')) {
        this.totalAmount = this.items.reduce((sum, item) => sum + item.total, 0);
    }
    
    next();
});

const PurchaseOrder: Model<IPurchaseOrderDocument> = mongoose.model<IPurchaseOrderDocument>(
    'PurchaseOrder',
    purchaseOrderSchema
);

export default PurchaseOrder;


