import { z } from 'zod';

export const createCategorySchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    parentCategory: z.string().optional(),
    isActive: z.boolean().optional(),
});

export const updateCategorySchema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    parentCategory: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
