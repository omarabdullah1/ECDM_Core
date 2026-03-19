import { z } from 'zod';

export const createInventoryFinanceSchema = z.object({
    itemCode: z.string().min(1, 'Item code is required'),
    itemName: z.string().min(1, 'Item name is required'),
    unit: z.string().optional(),
    unitPrice: z.number().min(0, 'Unit price must be non-negative'),
    category: z.string().optional(),
    supplier: z.string().optional(),
    minStockLevel: z.number().optional(),
    currentStock: z.number().optional(),
    notes: z.string().optional(),
});

export const updateInventoryFinanceSchema = z.object({
    itemCode: z.string().optional(),
    itemName: z.string().optional(),
    unit: z.string().optional(),
    unitPrice: z.number().min(0, 'Unit price must be non-negative').optional(),
    category: z.string().optional(),
    supplier: z.string().optional(),
    minStockLevel: z.number().optional(),
    currentStock: z.number().optional(),
    notes: z.string().optional(),
});

export type CreateInventoryFinanceInput = z.infer<typeof createInventoryFinanceSchema>;
export type UpdateInventoryFinanceInput = z.infer<typeof updateInventoryFinanceSchema>;
