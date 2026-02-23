import { Document, Types } from 'mongoose';

// Stock availability status
export enum InventoryItemStatus {
    InStock                = 'In stock',
    TemporarilyUnavailable = 'Temporarily unavailable',
    RepurchaseNeeded       = 'Repurchase needed',
    SoldOut                = 'Sold out',
}

export interface ISupplierDetails {
    supplierId?:  string;
    supplierName: string;
    phone?:       string;
    address?:     string;
}

export interface IInventoryItem {
    itemName:         string;
    stockNumber:      string;
    stockCount:       number;
    status:           InventoryItemStatus;
    price:            number;
    purchaseOrders:   string[];
    startDate?:       Date;
    endDate?:         Date;
    supplierDetails?: ISupplierDetails;
    category?:        Types.ObjectId;   // → Category
    notes?:           string;
    createdAt:        Date;
    updatedAt:        Date;
}

export interface IInventoryItemDocument extends IInventoryItem, Document {
    _id: Types.ObjectId;
}

// ─── Category ───────────────────────────────────────────────────────────────

export interface ICategory {
    name:            string;
    description?:    string;
    parentCategory?: Types.ObjectId;   // → Category (self-ref)
    isActive:        boolean;
    createdAt:       Date;
    updatedAt:       Date;
}

export interface ICategoryDocument extends ICategory, Document {
    _id: Types.ObjectId;
}

// ─── Product ────────────────────────────────────────────────────────────────

export interface IProduct {
    sku:                string;
    name:               string;
    description?:       string;
    category?:          Types.ObjectId;   // → Category
    unitPrice:          number;
    costPrice?:         number;
    currentStock:       number;
    lowStockThreshold:  number;
    unit:               string;
    isActive:           boolean;
    createdAt:          Date;
    updatedAt:          Date;
}

export interface IProductDocument extends IProduct, Document {
    _id:          Types.ObjectId;
    stockStatus?: string;
}

// ─── StockMovement ──────────────────────────────────────────────────────────

export enum MovementType {
    In      = 'IN',
    Out     = 'OUT',
    Adjust  = 'ADJUST',
}

export interface IStockMovement {
    product:      Types.ObjectId;   // → Product
    type:         MovementType;
    quantity:     number;
    reason?:      string;
    reference?:   string;
    performedBy:  Types.ObjectId;   // → User
    createdAt:    Date;
    updatedAt:    Date;
}

export interface IStockMovementDocument extends IStockMovement, Document {
    _id: Types.ObjectId;
}
