import mongoose, { Schema, Model } from 'mongoose';
import {
    IInventoryItemDocument,
    InventoryItemStatus,
} from './inventory-item.types';

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

// ── Main InventoryItem schema (Spare Parts + Finance) ─────────────────────────
const inventoryItemSchema = new Schema<IInventoryItemDocument>(
    {
        itemName: {
            type:      String,
            required:  [true, 'Item name is required'],
            trim:      true,
            maxlength: [200, 'Item name cannot exceed 200 characters'],
        },

        // Unique internal warehouse / stock reference number
        stockNumber: {
            type:     String,
            required: [true, 'Stock number is required'],
            unique:   true,
            trim:     true,
            uppercase:true,
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

        // External document links (PDF purchase orders, supplier contracts, etc.)
        purchaseOrders: { type: [String], default: [] },

        startDate: { type: Date }, // Start of stock availability / supplier contract
        endDate:   { type: Date }, // End of stock availability / supplier contract

        supplierDetails: { type: supplierDetailsSchema },

        // Optional link to the Category collection — shared taxonomy with Product
        category: {
            type: Schema.Types.ObjectId,
            ref:  'Category',
        },

        notes: { type: String, maxlength: [2000, 'Notes cannot exceed 2000 characters'] },
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
inventoryItemSchema.index({ itemName: 'text' });

// Auto-update status based on stockCount before every save
inventoryItemSchema.pre<IInventoryItemDocument>('save', function (next) {
    if (this.isModified('stockCount')) {
        if (this.stockCount <= 0) {
            this.status = InventoryItemStatus.SoldOut;
        } else if (this.status === InventoryItemStatus.SoldOut) {
            // Restore to InStock when stock is replenished
            this.status = InventoryItemStatus.InStock;
        }
    }
    next();
});

const InventoryItem: Model<IInventoryItemDocument> =
    mongoose.model<IInventoryItemDocument>('InventoryItem', inventoryItemSchema);

export default InventoryItem;
