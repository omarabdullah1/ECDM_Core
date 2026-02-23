import { Document, Types } from 'mongoose';

// Stock availability status for this spare part
export enum InventoryItemStatus {
    InStock               = 'In stock',
    TemporarilyUnavailable= 'Temporarily unavailable',
    RepurchaseNeeded      = 'Repurchase needed',
    SoldOut               = 'Sold out',
}

/**
 * Supplier contact information embedded in the InventoryItem document.
 * Stored inline (not as a separate collection) since supplier details
 * are specific to each item's procurement context.
 */
export interface ISupplierDetails {
    supplierId?:   string; // External supplier ID / ERP reference
    supplierName:  string;
    phone?:        string;
    address?:      string;
}

export interface IInventoryItem {
    itemName:    string;

    // Unique warehouse / SKU reference number
    stockNumber: string;

    // Current quantity in stock
    stockCount:  number;

    status:      InventoryItemStatus;

    // Unit cost / selling price of this spare part
    price:       number;

    // Array of URLs or file paths to purchase order documents (PDFs, etc.)
    purchaseOrders: string[];

    startDate?:  Date; // Date the item was first stocked / contract start
    endDate?:    Date; // Date the item expires / contract end

    supplierDetails?: ISupplierDetails;

    // Optional link to the Category collection (shared with Product)
    category?: Types.ObjectId;

    notes?:      string;
    createdAt:   Date;
    updatedAt:   Date;
}

export interface IInventoryItemDocument extends IInventoryItem, Document {
    _id: Types.ObjectId;
}
