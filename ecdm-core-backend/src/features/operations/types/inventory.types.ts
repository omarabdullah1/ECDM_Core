import mongoose from 'mongoose';

/**
 * Inventory TypeScript Types
 */

export interface IInventory {
    _id: string;
    sparePartsId: string;
    itemName: string;
    specification: string;
    dataSheetUrl: string;
    dataSheetFileName: string;
    category: 'Maintenance' | 'General supply' | 'Supply and installation';
    unitPrice: number;
    cost: number;
    availableQuantity: number;
    minStockLevel: number;
    notes: string;
    updatedBy: mongoose.Types.ObjectId | string;
    createdAt: Date;
    updatedAt: Date;
}

export interface InventoryCreatePayload {
    itemName: string;
    specification?: string;
    dataSheetUrl?: string;
    dataSheetFileName?: string;
    category?: string;
    unitPrice?: number;
    availableQuantity?: number;
    minStockLevel?: number;
    notes?: string;
}

export interface InventoryUpdatePayload {
    itemName?: string;
    specification?: string;
    dataSheetUrl?: string;
    dataSheetFileName?: string;
    category?: string;
    unitPrice?: number;
    availableQuantity?: number;
    minStockLevel?: number;
    notes?: string;
    updatedBy?: mongoose.Types.ObjectId | string;
}

export interface InventoryQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
}

