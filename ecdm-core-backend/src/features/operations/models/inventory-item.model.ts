import mongoose, { Schema, Model } from 'mongoose';
import { IInventoryItemDocument, InventoryItemStatus } from '../types/inventory-plus.types';

// ── Sub-document: supplier contact details ────────────────────────────────────
const supplierDetailsSchema = new Schema(
    {
        supplierId:   { type: String, trim: true },
        supplierName: { type: String, required: true, trim: true },
        phone:        { type: String, trim: true },
        address:      { type: String, trim: true },
    },
    { _id: false },
);

const inventoryItemSchema = new Schema<IInventoryItemDocument>(
    {
        itemName: {
            type:      String,
            required:  [true, 'Item name is required'],
            trim:      true,
            maxlength: [200, 'Item name cannot exceed 200 characters'],
        },
        stockNumber: {
            type:      String,
            required:  [true, 'Stock number is required'],
            unique:    true,
            trim:      true,
            uppercase: true,
        },
        stockCount: {
            type:    Number,
            default: 0,
            min:     [0, 'Stock count cannot be negative'],
        },
        status: {
            type:    String,
            enum:    Object.values(InventoryItemStatus),
            default: InventoryItemStatus.InStock,
        },
        price: {
            type:     Number,
            required: [true, 'Price is required'],
            min:      [0, 'Price cannot be negative'],
        },
        purchaseOrders:  { type: [String], default: [] },
        startDate:       { type: Date },
        endDate:         { type: Date },
        supplierDetails: { type: supplierDetailsSchema },
        category:        { type: Schema.Types.ObjectId, ref: 'Category' },
        notes:           { type: String, maxlength: [2000, 'Notes cannot exceed 2000 characters'] },
    },
    {
        timestamps: true,
        toJSON:     { virtuals: true },
        toObject:   { virtuals: true },
    },
);

inventoryItemSchema.index({ stockNumber: 1 }, { unique: true });
inventoryItemSchema.index({ status:      1 });
inventoryItemSchema.index({ category:    1 });
inventoryItemSchema.index({ itemName:    'text' });

inventoryItemSchema.pre<IInventoryItemDocument>('save', function (next) {
    if (this.isModified('stockCount')) {
        if (this.stockCount <= 0) {
            this.status = InventoryItemStatus.SoldOut;
        } else if (this.status === InventoryItemStatus.SoldOut) {
            this.status = InventoryItemStatus.InStock;
        }
    }
    next();
});

const InventoryItem: Model<IInventoryItemDocument> =
    mongoose.model<IInventoryItemDocument>('InventoryItem', inventoryItemSchema);

export default InventoryItem;
