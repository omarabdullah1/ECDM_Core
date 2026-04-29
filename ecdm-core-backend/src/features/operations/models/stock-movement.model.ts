import { Schema, model } from 'mongoose';
import { IStockMovementDocument, MovementType } from '../types/inventory-plus.types';

const stockMovementSchema = new Schema<IStockMovementDocument>(
    {
        product:     { type: Schema.Types.ObjectId, ref: 'Product', required: [true, 'Product is required'] },
        type:        { type: String, enum: Object.values(MovementType), required: [true, 'Movement type is required'] },
        quantity:    { type: Number, required: [true, 'Quantity is required'], min: [0.01, 'Quantity must be positive'] },
        reason:      { type: String, maxlength: 500 },
        reference:   { type: String, maxlength: 100, trim: true },
        performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

stockMovementSchema.index({ product:   1 });
stockMovementSchema.index({ type:      1 });
stockMovementSchema.index({ createdAt: -1 });

export default model<IStockMovementDocument>('StockMovement', stockMovementSchema);

