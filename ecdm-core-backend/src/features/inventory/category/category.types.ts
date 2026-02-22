import { Document, Types } from 'mongoose';

export interface ICategory {
    name: string;
    description?: string;
    parentCategory?: Types.ObjectId;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface ICategoryDocument extends ICategory, Document {
    _id: Types.ObjectId;
}
