import { z } from 'zod';
import { InventoryItemStatus } from './inventory-item.types';

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
