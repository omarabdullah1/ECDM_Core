import { Schema, model } from 'mongoose';
import { IProductDocument } from './product.types';

const productSchema = new Schema<IProductDocument>(
    {
        sku: { type: String, required: [true, 'SKU is required'], unique: true, uppercase: true, trim: true },
        name: { type: String, required: [true, 'Product name is required'], trim: true, maxlength: 200 },
        description: { type: String, maxlength: 2000 },
        category: { type: Schema.Types.ObjectId, ref: 'Category' },
        unitPrice: { type: Number, required: [true, 'Unit price is required'], min: 0 },
        costPrice: { type: Number, min: 0 },
        currentStock: { type: Number, default: 0 },
        lowStockThreshold: { type: Number, default: 10 },
        unit: { type: String, default: 'pcs', trim: true },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ sku: 1 });

productSchema.virtual('stockStatus').get(function (this: IProductDocument) {
    if (this.currentStock <= 0) return 'Out of Stock';
    if (this.currentStock <= this.lowStockThreshold) return 'Low Stock';
    return 'In Stock';
});

export default model<IProductDocument>('Product', productSchema);
