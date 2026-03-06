import { z } from 'zod';

/**
 * SparePart Validation Schemas
 * Uses Zod for runtime validation with TypeScript type inference
 */

// ─────────────────────────────────────────────────────────────────────────────
// Create Spare Part Schema
// ─────────────────────────────────────────────────────────────────────────────

export const createSparePartSchema = z.object({
    body: z.object({
        itemName: z.string({
            required_error: 'Item name is required',
        }).min(1, 'Item name is required').max(200, 'Item name cannot exceed 200 characters'),
        
        specification: z.string().max(2000, 'Specification cannot exceed 2000 characters').optional(),
        
        category: z.string().max(100, 'Category cannot exceed 100 characters').optional(),
        
        unitPrice: z.union([
            z.number().min(0, 'Unit price cannot be negative'),
            z.string().transform((val) => parseFloat(val) || 0),
        ]).optional(),
        
        notes: z.string().max(2000, 'Notes cannot exceed 2000 characters').optional(),
        
        // File fields are handled by multer, not validated here
        dataSheetUrl: z.string().optional(),
        dataSheetFileName: z.string().optional(),
    }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Update Spare Part Schema
// ─────────────────────────────────────────────────────────────────────────────

export const updateSparePartSchema = z.object({
    body: z.object({
        itemName: z.string().min(1, 'Item name cannot be empty').max(200, 'Item name cannot exceed 200 characters').optional(),
        
        specification: z.string().max(2000, 'Specification cannot exceed 2000 characters').optional(),
        
        category: z.string().max(100, 'Category cannot exceed 100 characters').optional(),
        
        unitPrice: z.union([
            z.number().min(0, 'Unit price cannot be negative'),
            z.string().transform((val) => parseFloat(val) || 0),
        ]).optional(),
        
        notes: z.string().max(2000, 'Notes cannot exceed 2000 characters').optional(),
        
        // File fields are handled by multer, not validated here
        dataSheetUrl: z.string().optional(),
        dataSheetFileName: z.string().optional(),
    }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Type Exports (Inferred from Zod Schemas)
// ─────────────────────────────────────────────────────────────────────────────

export type CreateSparePartInput = z.infer<typeof createSparePartSchema>['body'];
export type UpdateSparePartInput = z.infer<typeof updateSparePartSchema>['body'];
