import { z } from 'zod';
import { InventoryItemStatus, MovementType } from '../types/inventory-plus.types';

// ── InventoryItem ─────────────────────────────────────────────────────────────
const supplierDetailsSchema = z.object({
    supplierId:   z.string().optional(),
    supplierName: z.string().min(1, 'Supplier name is required'),
    phone:        z.string().optional(),
    address:      z.string().optional(),
});

export const createInventoryItemSchema = z.object({
    itemName:        z.string().min(1, 'Item name is required'),
    stockNumber:     z.string().min(1, 'Stock number is required'),
    stockCount:      z.number().int().min(0),
    status:          z.nativeEnum(InventoryItemStatus).optional(),
    price:           z.number().min(0),
    purchaseOrders:  z.array(z.string()).optional(),
    startDate:       z.string().optional(),
    endDate:         z.string().optional(),
    supplierDetails: supplierDetailsSchema.optional(),
    category:        z.string().optional(),
    notes:           z.string().optional(),
});

export const updateInventoryItemSchema = createInventoryItemSchema.partial();
export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;
export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>;

// ── Category ──────────────────────────────────────────────────────────────────
export const createCategorySchema = z.object({
    name:           z.string().min(1, 'Category name is required'),
    description:    z.string().optional(),
    parentCategory: z.string().optional(),
    isActive:       z.boolean().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

// ── Product ───────────────────────────────────────────────────────────────────
export const createProductSchema = z.object({
    sku:               z.string().min(1, 'SKU is required'),
    name:              z.string().min(1, 'Product name is required'),
    description:       z.string().optional(),
    category:          z.string().optional(),
    unitPrice:         z.number().min(0, 'Unit price must be non-negative'),
    costPrice:         z.number().min(0).optional(),
    currentStock:      z.number().int().min(0).optional(),
    lowStockThreshold: z.number().int().min(0).optional(),
    unit:              z.string().optional(),
    isActive:          z.boolean().optional(),
});

export const updateProductSchema = createProductSchema.partial();
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

// ── StockMovement ─────────────────────────────────────────────────────────────
export const createStockMovementSchema = z.object({
    product:     z.string().min(1, 'Product ID is required'),
    type:        z.nativeEnum(MovementType),
    quantity:    z.number().positive('Quantity must be positive'),
    reason:      z.string().optional(),
    reference:   z.string().optional(),
    performedBy: z.string().min(1, 'Performer ID is required'),
});

export const updateStockMovementSchema = createStockMovementSchema.partial();
export type CreateStockMovementInput = z.infer<typeof createStockMovementSchema>;
export type UpdateStockMovementInput = z.infer<typeof updateStockMovementSchema>;
