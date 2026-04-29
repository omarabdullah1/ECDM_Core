import { z } from 'zod';

export const createSalesTargetSchema = z.object({
    salespersonId: z.string().min(1, 'Salesperson ID is required'),
    month: z.number().min(1, 'Month must be between 1 and 12').max(12, 'Month must be between 1 and 12'),
    year: z.number().min(2020, 'Year must be 2020 or later'),
    targetAmount: z.number().min(0, 'Target amount cannot be negative'),
});

export const updateSalesTargetSchema = z.object({
    month: z.number().min(1).max(12).optional(),
    year: z.number().min(2020).optional(),
    targetAmount: z.number().min(0).optional(),
});

export type CreateSalesTargetInput = z.infer<typeof createSalesTargetSchema>;
export type UpdateSalesTargetInput = z.infer<typeof updateSalesTargetSchema>;

