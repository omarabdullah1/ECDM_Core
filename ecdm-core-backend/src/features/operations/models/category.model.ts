import { Schema, model } from 'mongoose';
import { ICategoryDocument } from '../types/inventory-plus.types';

const categorySchema = new Schema<ICategoryDocument>(
    {
        name:           { type: String, required: [true, 'Category name is required'], unique: true, trim: true, maxlength: 100 },
        description:    { type: String, maxlength: 500 },
        parentCategory: { type: Schema.Types.ObjectId, ref: 'Category' },
        isActive:       { type: Boolean, default: true },
    },
    { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

categorySchema.index({ name: 'text' });

export default model<ICategoryDocument>('Category', categorySchema);
