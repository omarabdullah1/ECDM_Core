import mongoose from 'mongoose';

/**
 * PriceList TypeScript Types
 */

export interface IPriceList {
    _id: string;
    sparePartsId: string;
    itemName: string;
    specification: string;
    dataSheetUrl: string;
    dataSheetFileName: string;
    category: 'Maintenance' | 'General supply' | 'Supply and installation';
    unitPrice: number;
    notes: string;
    updatedBy: mongoose.Types.ObjectId | string;
    createdAt: Date;
    updatedAt: Date;
}

export interface PriceListCreatePayload {
    itemName: string;
    specification?: string;
    dataSheetUrl?: string;
    dataSheetFileName?: string;
    category?: string;
    unitPrice?: number;
    notes?: string;
}

export interface PriceListUpdatePayload {
    itemName?: string;
    specification?: string;
    dataSheetUrl?: string;
    dataSheetFileName?: string;
    category?: string;
    unitPrice?: number;
    notes?: string;
    updatedBy?: mongoose.Types.ObjectId | string;
}

export interface PriceListQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
}
