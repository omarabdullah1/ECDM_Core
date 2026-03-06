import mongoose from 'mongoose';

/**
 * SparePart TypeScript Types
 */

export interface ISparePart {
    _id: string;
    sparePartsId: string;
    itemName: string;
    specification: string;
    dataSheetUrl: string;
    dataSheetFileName: string;
    category: string;
    unitPrice: number;
    notes: string;
    updatedBy: mongoose.Types.ObjectId | string;
    createdAt: Date;
    updatedAt: Date;
}

export interface SparePartCreatePayload {
    itemName: string;
    specification?: string;
    dataSheetUrl?: string;
    dataSheetFileName?: string;
    category?: string;
    unitPrice?: number;
    notes?: string;
}

export interface SparePartUpdatePayload {
    itemName?: string;
    specification?: string;
    dataSheetUrl?: string;
    dataSheetFileName?: string;
    category?: string;
    unitPrice?: number;
    notes?: string;
    updatedBy?: mongoose.Types.ObjectId | string;
}

export interface SparePartQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
}
