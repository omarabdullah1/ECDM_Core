import { Document, Types } from 'mongoose';

export enum MovementType {
    In = 'In',
    Out = 'Out',
    Adjustment = 'Adjustment',
}

export interface IStockMovement {
    product: Types.ObjectId;
    type: MovementType;
    quantity: number;
    reason?: string;
    reference?: string;
    performedBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

export interface IStockMovementDocument extends IStockMovement, Document {
    _id: Types.ObjectId;
}
