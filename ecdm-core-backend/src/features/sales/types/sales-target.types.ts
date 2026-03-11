import { Document, Types } from 'mongoose';

/**
 * Sales Target Interface - Monthly targets for salespeople
 */
export interface ISalesTarget {
    salespersonId: Types.ObjectId;
    month: number; // 1-12
    year: number;
    targetAmount: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface ISalesTargetDocument extends ISalesTarget, Document {
    _id: Types.ObjectId;
}
