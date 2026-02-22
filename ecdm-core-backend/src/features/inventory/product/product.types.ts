import { Document, Types } from 'mongoose';

export interface IProduct {
    sku: string;
    name: string;
    description?: string;
    category?: Types.ObjectId;
    unitPrice: number;
    costPrice?: number;
    currentStock: number;
    lowStockThreshold: number;
    unit: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface IProductDocument extends IProduct, Document {
    _id: Types.ObjectId;
    stockStatus: string; // virtual
}
