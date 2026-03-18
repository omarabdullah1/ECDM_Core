import { z } from 'zod';

/**
 * PriceList Validation Schemas
 */

const CATEGORY_VALUES = ['Maintenance', 'General supply', 'Supply and installation'] as const;

// ─── Create ───────────────────────────────────────────────────────────────────

export const createPriceListSchema = z.object({
    body: z.object({
        itemName: z
            .string({ required_error: 'Item name is required' })
            .min(1, 'Item name is required')
            .max(200, 'Item name cannot exceed 200 characters'),

        specification: z.string().max(2000).optional(),

        category: z.enum(CATEGORY_VALUES).or(z.literal('')).optional(),

        unitPrice: z
            .union([
                z.number().min(0, 'Unit price cannot be negative'),
                z.string().transform((val) => parseFloat(val) || 0),
            ])
            .optional(),

        notes: z.string().max(2000).optional(),

        // File fields populated by multer middleware
        dataSheetUrl: z.string().optional(),
        dataSheetFileName: z.string().optional(),
    }),
});

// ─── Update ───────────────────────────────────────────────────────────────────

export const updatePriceListSchema = z.object({
    body: z.object({
        itemName: z.string().min(1).max(200).optional(),
        specification: z.string().max(2000).optional(),
        category: z.enum(CATEGORY_VALUES).or(z.literal('')).optional(),
        unitPrice: z
            .union([
                z.number().min(0),
                z.string().transform((val) => parseFloat(val) || 0),
            ])
            .optional(),
        notes: z.string().max(2000).optional(),
        dataSheetUrl: z.string().optional(),
        dataSheetFileName: z.string().optional(),
    }),
});

// ─── Type Exports ─────────────────────────────────────────────────────────────

export type CreatePriceListInput = z.infer<typeof createPriceListSchema>['body'];
export type UpdatePriceListInput = z.infer<typeof updatePriceListSchema>['body'];
