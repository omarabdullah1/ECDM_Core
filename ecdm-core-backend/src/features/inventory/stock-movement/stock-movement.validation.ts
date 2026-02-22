import { z } from 'zod';

export const createStockMovementSchema = z.object({
    product: z.string().min(1),
    type: z.enum(['In', 'Out', 'Adjustment']),
    quantity: z.number().positive(),
    reason: z.string().max(500).optional(),
    reference: z.string().max(100).optional(),
});

export type CreateStockMovementInput = z.infer<typeof createStockMovementSchema>;
