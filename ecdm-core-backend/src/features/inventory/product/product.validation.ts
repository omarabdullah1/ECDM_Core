import { z } from 'zod';

export const createProductSchema = z.object({
    sku: z.string().min(1).max(50),
    name: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    category: z.string().optional(),
    unitPrice: z.number().min(0),
    costPrice: z.number().min(0).optional(),
    currentStock: z.number().min(0).optional(),
    lowStockThreshold: z.number().min(0).optional(),
    unit: z.string().max(20).optional(),
    isActive: z.boolean().optional(),
});

export const updateProductSchema = z.object({
    sku: z.string().min(1).max(50).optional(),
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
    category: z.string().nullable().optional(),
    unitPrice: z.number().min(0).optional(),
    costPrice: z.number().min(0).optional(),
    lowStockThreshold: z.number().min(0).optional(),
    unit: z.string().max(20).optional(),
    isActive: z.boolean().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
